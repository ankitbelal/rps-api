import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';
import { Repository } from 'typeorm';
import { Subject } from './subject.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { SubjectQueryDto } from './dto/subject-query-dto';

@Injectable()
export class SubjectService {
  constructor(
    @InjectRepository(Subject)
    private readonly subjectRepo: Repository<Subject>,
  ) {}

  async create(createSubjectDto: CreateSubjectDto): Promise<Subject> {
    const exists = await this.subjectRepo.findOne({
      where: {
        code: createSubjectDto.code,
        programId: createSubjectDto.programId,
      },
    });
    if (exists)
      throw new BadRequestException('Subject already exists for the program');
    const subject = this.subjectRepo.create(createSubjectDto);
    return this.subjectRepo.save(subject);
  }

  async findAll(
    SubjectQueryDto: SubjectQueryDto,
  ): Promise<{
    data: Subject[];
    total: number;
    page: number;
    lastPage: number;
  }> {
    const { page = 1, limit = 10, ...filters } = SubjectQueryDto;
    const query = this.subjectRepo.createQueryBuilder('subject');

    if (filters.name) {
      query.andWhere('subject.name LIKE :name', { name: `%${filters.name}` });
    }

    if (filters.code) {
      query.andWhere('subject.code LIKE :code', { code: `%${filters.code}` });
    }

    if (filters.programId) {
      query.andWhere('subject.programId LIKE :programId', {
        programId: `%${filters.programId}`,
      });
    }

    if (filters.type) {
      query.andWhere('subject.type LIKE :type', { type: `%${filters.type}` });
    }

    if (filters.semester) {
      query.andWhere('subject.semester LIKE :semester', {
        semester: `%${filters.semester}`,
      });
    }
    query.skip((page - 1) * limit).take(limit);
    query.orderBy('subject.name', 'ASC');
    const [data, total] = await query.getManyAndCount();
    const lastPage = Math.ceil(total / limit);

    return { data, total, page, lastPage };
  }

  async update(
    id: number,
    updateSubjectDto: UpdateSubjectDto,
  ): Promise<Subject> {
    const subject = await this.subjectRepo.findOne({ where: { id } });
    if (!subject)
      throw new NotFoundException(`Subject with id${id} doesn't exists`);
    return await this.subjectRepo.save(updateSubjectDto);
  }

  async remove(id: number) {
    const subject = await this.subjectRepo.findOne({ where: { id } });
    if (!subject)
      throw new NotFoundException(`Subject with id ${id} doesnt't exists`);
    return await this.subjectRepo.remove(subject);
  }
}
