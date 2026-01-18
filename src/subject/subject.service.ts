import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';
import { Brackets, In, Repository } from 'typeorm';
import { Subject } from '../database/entities/subject.entity';
import { InjectRepository } from '@nestjs/typeorm';
import {
  SubjectListingQueryDto,
  SubjectQueryDto,
} from './dto/subject-query-dto';
import { SelectQueryBuilder } from 'typeorm/browser';
import { SubjectResponse } from './interfaces/subject.interface';
import { SubjectTeachers } from 'src/database/entities/subject-teacher.entity';
import { SubjectTeacherStatus } from 'utils/enums/general-enums';
import { AssignSubjectDto } from 'src/teacher/dto/teacher.dto';

@Injectable()
export class SubjectService {
  constructor(
    @InjectRepository(Subject)
    private readonly subjectRepo: Repository<Subject>,

    @InjectRepository(SubjectTeachers)
    private readonly subjectTeacherRepo: Repository<SubjectTeachers>,
  ) {}

  async create(createSubjectDto: CreateSubjectDto): Promise<Boolean> {
    const exists = await this.checkDuplicateSubjects(createSubjectDto.code);
    if (exists)
      throw new ConflictException(
        `Subject already exists for Code: ${createSubjectDto.code}.`,
      );
    const subject = await this.subjectRepo.save(
      this.subjectRepo.create(createSubjectDto),
    );

    if (createSubjectDto.teacherId) {
      const teacherAsignmentData = {
        teacherId: createSubjectDto.teacherId,
        subjectId: subject.id,
        status: SubjectTeacherStatus.ACTIVE,
      };
      await this.subjectTeacherRepo.save(
        this.subjectTeacherRepo.create(teacherAsignmentData),
      );
    }
    return true;
  }

  async findAll(SubjectQueryDto: SubjectQueryDto): Promise<{
    data: SubjectResponse[];
    total?: number;
    page?: number;
    lastPage?: number;
    limit?: number;
  }> {
    const { page = 1, limit = 10, ...filters } = SubjectQueryDto;
    const query = this.subjectRepo
      .createQueryBuilder('subject')
      .innerJoin('subject.program', 'program')
      .leftJoin(
        'subject.subjectTeacher',
        'st',
        `st.id = (
        SELECT st2.id FROM subject_teachers st2
        WHERE st2.subject_id = subject.id and st2.status =:status
        ORDER BY st2.created_at DESC
        LIMIT 1
      )`,
        { status: SubjectTeacherStatus.ACTIVE },
      )
      .leftJoin('st.teacher', 'teacher');

    if (filters?.id) {
      query.andWhere('subject.id = :id', { id: filters.id });

      query.select(Subject.ALLOWED_DETAILS);
      const data = await query.getOne();
      if (!data)
        throw new NotFoundException({
          statusCode: 404,
          message: `Subject with id: ${filters.id} does not exists`,
        });
      return { data: this.denormalizeSubjects(data) };
    }

    const filteredquery = this.applyFilters(query, filters);
    filteredquery.select(Subject.ALLOWED_FIELDS_LIST);

    query.skip((page - 1) * limit).take(limit);
    query.orderBy('subject.name', 'ASC');
    const [data, total] = await query.getManyAndCount();

    const lastPage = Math.ceil(total / limit);

    return {
      data: this.denormalizeSubjects(data),
      total,
      page,
      lastPage,
      limit,
    };
  }

  private applyFilters(
    query: SelectQueryBuilder<Subject>,
    filters: Partial<SubjectQueryDto>,
  ): SelectQueryBuilder<Subject> {
    if (filters?.type) {
      query.andWhere('subject.type = :type', {
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
          }).orWhere('subject.code LIKE :search', {
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

  private denormalizeSubjects(data: Subject | Subject[]): SubjectResponse[] {
    const subjects = Array.isArray(data) ? data : [data];

    return subjects.map((subject) => {
      const latestTeacher = subject.subjectTeacher[0]?.teacher;

      return {
        ...subject,
        subjectTeacher: latestTeacher || null,
      };
    });
  }

  async getAllSubjectList(
    subjectListingQueryDto: SubjectListingQueryDto,
  ): Promise<{ data: SubjectResponse[] }> {
    const { teacherId, assignmentType } = subjectListingQueryDto;

    const query = this.subjectRepo
      .createQueryBuilder('subject')
      .innerJoin('subject.program', 'program')
      .leftJoin('subject.subjectTeacher', 'st', 'st.status = :status', {
        status: SubjectTeacherStatus.ACTIVE,
      })
      .leftJoin('st.teacher', 'teacher')
      .select([
        'subject.id',
        'subject.code',
        'subject.name',
        'subject.semester',
        'subject.type',
        'program.id',
        'program.name',
        'program.code',
        'st.id',
        'teacher.id',
        'teacher.firstName',
        'teacher.lastName',
      ]);

    if (teacherId) {
      query
        .addSelect(
          `
      CASE
        WHEN st.id IS NULL THEN 0
        WHEN st.teacherId = :teacherId THEN 1
        ELSE 2
      END
      `,
          'assigned',
        )
        .setParameter('teacherId', teacherId);

      if (assignmentType === 'assigned') {
        query.andWhere('st.teacherId = :teacherId', { teacherId });
      } else if (assignmentType === 'unassigned') {
        query.andWhere(
          new Brackets((qb) => {
            qb.where('st.id IS NULL').orWhere('st.teacherId != :teacherId', {
              teacherId,
            });
          }),
        );
      }
    }

    this.applyFilters(query, subjectListingQueryDto);
    const data = await query.getMany();
    return { data: this.denormalizeSubjects(data) };
  }

  async assignSubjectTeacher(
    assignSubjectDto: AssignSubjectDto,
  ): Promise<boolean> {
    const { teacherId, subjects } = assignSubjectDto;
    const toAssign = subjects || [];

    if (toAssign.length === 0) {
      await this.subjectTeacherRepo
        .createQueryBuilder()
        .update(SubjectTeachers)
        .set({ status: SubjectTeacherStatus.OLD })
        .where('teacher_id = :teacherId', { teacherId })
        .andWhere('status = :status', { status: SubjectTeacherStatus.ACTIVE })
        .execute();

      return true;
    }

    const [currentAssignments, teacherCurrentAssignments] = await Promise.all([
      this.subjectTeacherRepo.find({
        where: {
          subjectId: In(toAssign),
          status: SubjectTeacherStatus.ACTIVE,
        },
      }),

      this.subjectTeacherRepo.find({
        where: { teacherId, status: SubjectTeacherStatus.ACTIVE },
      }),
    ]);
    const toUpdate: SubjectTeachers[] = [];
    const toInsert: Partial<SubjectTeachers>[] = [];

    for (const assignment of teacherCurrentAssignments) {
      if (!toAssign.includes(assignment.subjectId)) {
        assignment.status = SubjectTeacherStatus.OLD;
        toUpdate.push(assignment);
      }
    }

    for (const subjectId of toAssign) {
      const activeAssignment = currentAssignments.find(
        (st) => st.subjectId === subjectId,
      );

      if (activeAssignment) {
        if (activeAssignment.teacherId === teacherId) {
          continue;
        } else {
          activeAssignment.status = SubjectTeacherStatus.OLD;
          toUpdate.push(activeAssignment);
        }
      }

      toInsert.push({
        subjectId,
        teacherId,
        status: SubjectTeacherStatus.ACTIVE,
      });
    }

    if (toUpdate.length > 0) {
      await this.subjectTeacherRepo.save(toUpdate);
    }

    if (toInsert.length > 0) {
      await this.subjectTeacherRepo.save(
        this.subjectTeacherRepo.create(toInsert),
      );
    }

    return true;
  }
}
