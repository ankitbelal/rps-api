import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Faculty } from 'src/database/entities/faculty.entity';
import { Repository } from 'typeorm';
import {
  CreateFacultyDto,
  UpdateFacultyDto,
  FacultyQueryDto,
  SearchFacultyListDto,
} from './dto/faculty-dto';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class FacultyService {
  constructor(
    @InjectRepository(Faculty)
    private readonly facultyRepo: Repository<Faculty>,
  ) {}

  async create(createFacultyDto: CreateFacultyDto): Promise<Boolean> {
    const exists = await this.checkDuplicate(createFacultyDto.name);
    if (exists) throw new BadRequestException('Faculty already registered.');
    const faculties = this.facultyRepo.create(createFacultyDto);
    return !!(await this.facultyRepo.save(faculties));
  }

  async findAll(facultyQueryDto: FacultyQueryDto): Promise<{
    data: Faculty[];
    total: number;
    page: number;
    limit: number;
    lastPage: number;
  }> {
    const { page = 1, limit = 10, ...filters } = facultyQueryDto;
    const query = this.facultyRepo
      .createQueryBuilder('faculty')
      .leftJoinAndSelect('faculty.program', 'program');
    if (filters.search) {
      query.andWhere('faculty.name LIKE :name', {
        name: `%${filters.search}%`,
      });
    }
    query.andWhere('faculty.deletedAt IS NULL');
    query.select(Faculty.ALLOWED_FIELDS_LIST);
    query.orderBy('faculty.name', 'ASC');
    const [data, total] = await query.getManyAndCount();
    const lastPage = Math.ceil(total / limit);
    return { data, total, page, limit, lastPage };
  }

  async update(
    id: number,
    updateFacultyDto: UpdateFacultyDto,
  ): Promise<Boolean> {
    const faculty = await this.facultyRepo.findOne({ where: { id } });
    if (!faculty)
      throw new NotFoundException(`Faculty with id: ${id} doesnt exists.`);
    if (updateFacultyDto.name && updateFacultyDto.name !== faculty.name) {
      const exists = await this.checkDuplicate(updateFacultyDto.name);
      if (exists) throw new ConflictException(`Faculty already exists.`);
    }
    Object.assign(faculty, updateFacultyDto);
    return !!(await this.facultyRepo.save(faculty));
  }

  async remove(id: number): Promise<Boolean> {
    const faculty = await this.facultyRepo.findOne({ where: { id } });
    if (!faculty)
      throw new NotFoundException(`Faculty with ${id} doesnt exists.`);
    return !!(await this.facultyRepo.softRemove(faculty));
  }

  async findFacultyById(id: number): Promise<Boolean> {
    return !!(await this.facultyRepo.findOne({ where: { id } }));
  }

  async getFacultyCount(): Promise<number> {
    return await this.facultyRepo.count();
  }

  async checkDuplicate(name: string): Promise<Boolean> {
    return !!(await this.facultyRepo.findOne({ where: { name } }));
  }

  async getAllFacultyList(
    searchFacultyListDto: SearchFacultyListDto,
  ): Promise<{ data: Faculty[] }> {
    const query = this.facultyRepo
      .createQueryBuilder('faculty')
      .select(['faculty.id', 'faculty.name']);

    if (searchFacultyListDto.name) {
      query.andWhere('faculty.name LIKE :name', {
        name: `%${searchFacultyListDto.name}%`,
      });
    }

    const data = await query.getMany();
    return { data };
  }
}
