import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateFacultyDto } from './dto/create-faculty-dto';
import { Faculty } from 'src/database/entities/faculty.entity';
import { Repository } from 'typeorm';
import { UpdateFacultyDto } from './dto/update-faculty-dto';
import { FacultyQueryDto } from './dto/faculty-query-dto';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class FacultyService {
  constructor(
    @InjectRepository(Faculty)
    private readonly facultyRepo: Repository<Faculty>,
  ) {}

  async create(createFacultyDto: CreateFacultyDto): Promise<Faculty> {
    const exists = await this.facultyRepo.findOne({
      where: { name: createFacultyDto.name },
    });
    if (exists) throw new BadRequestException('Faculty already registered.');
    const faculties = this.facultyRepo.create(createFacultyDto);
    return await this.facultyRepo.save(faculties);
  }

  async findAll(facultyQueryDto: FacultyQueryDto): Promise<{
    data: Faculty[];
    total: number;
    page: number;
    lastPage: number;
  }> {
    const { page = 1, limit = 10, ...filters } = facultyQueryDto;
    const query = this.facultyRepo.createQueryBuilder('faculty');
    if (filters.name) {
      query.andWhere('faculty.name :LIKE :name', { name: `%${filters.name}%` });
    }
    query.skip((page - 1) * limit).take(limit);
    query.orderBy('faculty.name', 'ASC');
    const [data, total] = await query.getManyAndCount();
    const lastPage = Math.ceil(total / limit);
    return { data, total, page, lastPage };
  }

  async update(
    id: number,
    UpdateFacultyDto: UpdateFacultyDto,
  ): Promise<Faculty> {
    const exists = await this.facultyRepo.findOne({
      where: { name: UpdateFacultyDto.name },
    });
    if (exists) throw new BadRequestException('Faculty already exists.');
    const faculty = await this.facultyRepo.findOne({ where: { id } });
    if (!faculty)
      throw new NotFoundException(`Faculty with id: ${id} doesnt exists.`);
    Object.assign(faculty, UpdateFacultyDto);
    return await this.facultyRepo.save(faculty);
  }

  async remove(id: number) {
    const faculty = await this.facultyRepo.findOne({ where: { id } });
    if (!faculty)
      throw new NotFoundException(`Faculty with ${id} doesnt exists.`);
    await this.facultyRepo.remove(faculty);
  }
}
