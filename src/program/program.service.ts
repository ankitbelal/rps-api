import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateProgramDto } from './dto/create-program.dto';
import { UpdateProgramDto } from './dto/update-program.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Program } from '../database/entities/program.entity';
import { Repository } from 'typeorm';
import { ProgramQueryDto } from './dto/program-query-dto';

@Injectable()
export class ProgramService {
  constructor(
    @InjectRepository(Program)
    private readonly programRepo: Repository<Program>,
  ) {}

  async create(createProgramDto: CreateProgramDto): Promise<Program> {
    const exists = await this.programRepo.findOne({
      where: { code: createProgramDto.code },
    });
    if (exists)
      throw new BadRequestException(
        `Program already exists for Code ${createProgramDto.code}`,
      );
    const program = this.programRepo.create(createProgramDto);
    return this.programRepo.save(program);
  }

  async findAll(programQueryDto: ProgramQueryDto): Promise<{
    data: Program[];
    total: number;
    page: number;
    lastPage: number;
  }> {
    const { page = 1, limit = 10, ...filters } = programQueryDto;
    const query = this.programRepo.createQueryBuilder('program');
    if (filters.name) {
      query.andWhere('program.name LIKE :name', { name: `%${filters.name}%` });
    }
    if (filters?.code) {
      query.andWhere('program.name LIKE :code', { name: `%${filters.code}%` });
    }
    if (filters?.faculty) {
      query.andWhere('program.name LIKE :faculty', {
        name: `%${filters.faculty}%`,
      });
    }
    query.skip((page - 1) * limit).take(limit);
    query.orderBy('program.name', 'ASC');
    const [data, total] = await query.getManyAndCount();
    const lastPage = Math.ceil(total / limit);

    return { data, total, page, lastPage };
  }

  async update(id: number, updateProgramDto: UpdateProgramDto) {
    const program = await this.programRepo.findOne({ where: { id } });
    if (!program) throw new NotFoundException(`Program with ${id} doesn't exists`);
    Object.assign(program, updateProgramDto);
    return await this.programRepo.save(program);
  }

  async remove(id: number) {
    const program = await this.programRepo.findOne({ where: { id } });
    if (!program) throw new NotFoundException(`program with ${id} doesn't exists`);
    await this.programRepo.remove(program);
  }
}
