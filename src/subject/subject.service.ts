import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';
import { Brackets, Repository } from 'typeorm';
import { Subject } from '../database/entities/subject.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { SubjectQueryDto } from './dto/subject-query-dto';
import { SelectQueryBuilder } from 'typeorm/browser';
import { ProgramService } from 'src/program/program.service';

@Injectable()
export class SubjectService {
  constructor(
    @InjectRepository(Subject)
    private readonly subjectRepo: Repository<Subject>,
    private readonly porgramService: ProgramService,
  ) {}

  async create(createSubjectDto: CreateSubjectDto): Promise<Boolean> {
    // const program = await this.porgramService.findProgramById(
    //   createSubjectDto.programId,
    // );
    // if (!program)
    //   throw new NotFoundException(
    //     `Program with ${createSubjectDto.programId} does not exist`,
    //   );

    const exists = await this.checkDuplicateSubjects(createSubjectDto.code);
    if (exists)
      throw new ConflictException(
        `Subject already exists for Code: ${createSubjectDto.code}.`,
      );
    const subject = this.subjectRepo.create(createSubjectDto);
    return !!(await this.subjectRepo.save(subject));
  }

  async findAll(SubjectQueryDto: SubjectQueryDto): Promise<{
    data: Subject[];
    total?: number;
    page?: number;
    lastPage?: number;
    limit?: number;
  }> {
    const { page = 1, limit = 10, ...filters } = SubjectQueryDto;
    const query = this.subjectRepo
      .createQueryBuilder('subject')
      .innerJoin('subject.program', 'program')
      .innerJoin('subject.teacher', 'teacher');

    if (filters?.id) {
      query.andWhere('subject.id = :id', { id: filters.id });

      query.select(Subject.ALLOWED_DETAILS);
      const data = await query.getOne();
      if (!data)
        throw new NotFoundException({
          statusCode: 404,
          message: `Subject with id: ${filters.id} does not exists`,
        });
      return { data: [data] };
    }

    const filteredquery = this.applyFilters(query, filters);
    filteredquery.select(Subject.ALLOWED_FIELDS_LIST);

    query.skip((page - 1) * limit).take(limit);
    query.orderBy('subject.name', 'ASC');
    const [data, total] = await query.getManyAndCount();
    const lastPage = Math.ceil(total / limit);

    return { data, total, page, lastPage, limit };
  }

  private applyFilters(
    query: SelectQueryBuilder<Subject>,
    filters: Partial<SubjectQueryDto>,
  ): SelectQueryBuilder<Subject> {
    if (filters?.type) {
      query.andWhere('student.status = :type', {
        type: filters.type,
      });
    }

    if (filters?.programId) {
      query.andWhere('subject.program_id = :programId', {
        programId: filters.programId,
      });
    }

    if (filters?.semester) {
      query.andWhere('subject.semester = :semester', {
        semester: filters.semester,
      });
    }

    if (filters?.search) {
      query.andWhere(
        new Brackets((qb) => {
          qb.where('subject.name LIKE :search', {
            search: `%${filters.search}%`,
          }).orWhere('student.code LIKE :search', {
            search: `%${filters.search}%`,
          });
        }),
      );
    }

    return query;
  }

  async update(
    id: number,
    updateSubjectDto: UpdateSubjectDto,
  ): Promise<Boolean> {
    const subject = await this.subjectRepo.findOne({ where: { id } });
    if (!subject)
      throw new NotFoundException(`Subject with id${id} doesn't exists`);

    if (updateSubjectDto.code && updateSubjectDto.code !== subject.code) {
      const exist = await this.checkDuplicateSubjects(updateSubjectDto.code);
      if (exist)
        throw new ConflictException(
          `Subject with code: ${updateSubjectDto.code} already exists.`,
        );
    }
    Object.assign(subject, updateSubjectDto);
    return !!(await this.subjectRepo.save(subject));
  }

  async remove(id: number): Promise<Boolean> {
    const subject = await this.subjectRepo.findOne({ where: { id } });
    if (!subject)
      throw new NotFoundException(`Subject with id ${id} doesnt't exists`);
    return !!(await this.subjectRepo.remove(subject));
  }

  async getSubjectCount(): Promise<number> {
    return await this.subjectRepo.count();
  }

  async checkDuplicateSubjects(code: string): Promise<Boolean> {
    return !!(await this.subjectRepo.findOne({ where: { code } }));
  }
}
