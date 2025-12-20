import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CreateProgramDto,
  ProgramQueryDto,
  UpdateProgramDto,
} from './dto/program.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Program } from '../database/entities/program.entity';
import { Repository } from 'typeorm';
import { FacultyService } from 'src/faculty/faculty.service';

@Injectable()
export class ProgramService {
  constructor(
    @InjectRepository(Program)
    private readonly programRepo: Repository<Program>,
    private readonly facultyService: FacultyService,
  ) {}

  async create(createProgramDto: CreateProgramDto): Promise<Boolean> {
    const faculty = await this.facultyService.findFacultyById(
      createProgramDto.facultyId,
    );
    if (!faculty)
      throw new NotFoundException(
        `Faculty with ${createProgramDto.facultyId} does not exist`,
      );

    const exists = await this.programRepo.findOne({
      where: { code: createProgramDto.code },
    });
    if (exists)
      throw new ConflictException(
        `Program already exists for Code: ${createProgramDto.code}.`,
      );
    const program = this.programRepo.create(createProgramDto);
    return !!(await this.programRepo.save(program));
  }

  async findAll(programQueryDto: ProgramQueryDto): Promise<{
    data: Program[];
    total?: number;
    page?: number;
    lastPage?: number;
  }> {
    const { page = 1, limit = 10, ...filters } = programQueryDto;
    const query = this.programRepo.createQueryBuilder('program');
    if (filters.name) {
      query.andWhere('program.name LIKE :name', { name: `%${filters.name}%` });
    }
    if (filters?.code) {
      query.andWhere('program.code = :code', { code: filters.code });
    }
    if (filters.faculty_id) {
      query.andWhere('program.faculty_id = :faculty_id', {
        faculty_id: filters.faculty_id,
      });
    }

    //only one details fetch
    if (filters?.id) {
      query.andWhere('program.id = :id', { id: filters.id });
      query.select(Program.ALLOWED_DETAILS);
      const data = await query.getOne();
      if (!data)
        throw new NotFoundException(
          `Program with id: ${filters.id} doesn't exists.`,
        );
      return { data: [data] };
    }
    query.select(Program.ALLOWED_FIELDS_LIST);

    query.skip((page - 1) * limit).take(limit);
    query.orderBy('program.name', 'ASC');
    const [data, total] = await query.getManyAndCount();
    const lastPage = Math.ceil(total / limit);

    return { data, total, page, lastPage };
  }

  async update(
    id: number,
    updateProgramDto: UpdateProgramDto,
  ): Promise<Boolean> {
    const program = await this.programRepo.findOne({ where: { id } });
    if (!program)
      throw new NotFoundException(`Program with id: ${id} doesn't exists.`);
    Object.assign(program, updateProgramDto);
    return !!(await this.programRepo.save(program));
  }

  async remove(id: number): Promise<Boolean> {
    const program = await this.programRepo.findOne({ where: { id } });
    if (!program)
      throw new NotFoundException(`Program with id: ${id} doesn't exists.`);
    return !!(await this.programRepo.remove(program));
  }

  async getProgramCount(): Promise<number> {
    return await this.programRepo.count();
  }
}
