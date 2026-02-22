import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';
import { Brackets, In, LessThanOrEqual, Repository } from 'typeorm';
import { Subject } from '../database/entities/subject.entity';
import { InjectRepository } from '@nestjs/typeorm';
import {
  SubjectEvaluationMarksQueryDto,
  SubjectListingQueryDto,
  SubjectQueryDto,
} from './dto/subject-query-dto';
import { SelectQueryBuilder } from 'typeorm/browser';
import {
  ProgramSemesterDashboard,
  ProgramSemesterPair,
  SubjectInternal,
  SubjectInternalResponse,
  SubjectResponse,
  SubjectTeacher,
} from './interfaces/subject.interface';
import { SubjectTeachers } from 'src/database/entities/subject-teacher.entity';
import { SubjectTeacherStatus, UserType } from 'utils/enums/general-enums';
import { AssignSubjectDto } from 'src/teacher/dto/teacher.dto';
import { EvaluationParametersService } from 'src/evaluation-parameters/evaluation-parameters.service';
import { UserService } from 'src/user/user.service';

@Injectable()
export class SubjectService {
  constructor(
    @InjectRepository(Subject)
    private readonly subjectRepo: Repository<Subject>,

    @InjectRepository(SubjectTeachers)
    private readonly subjectTeacherRepo: Repository<SubjectTeachers>,

    private readonly evaluationParameterService: EvaluationParametersService,
    private readonly userService: UserService,
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
      const subjectTeacher: SubjectTeacher = {
        teacherId: createSubjectDto.teacherId,
        subjectId: subject.id,
        status: SubjectTeacherStatus.ACTIVE,
      };
      await this.createSubjectTeacher(subjectTeacher);
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

    const filteredquery = await this.applyFilters(query, filters);
    filteredquery.select(Subject.ALLOWED_FIELDS_LIST);

    filteredquery.skip((page - 1) * limit).take(limit);
    filteredquery.orderBy('subject.name', 'ASC');

    const [data, total] = await filteredquery.getManyAndCount();
    const lastPage = Math.ceil(total / limit);

    return {
      data: this.denormalizeSubjects(data),
      total,
      page,
      lastPage,
      limit,
    };
  }

  private async applyFilters(
    query: SelectQueryBuilder<Subject>,
    filters: Partial<SubjectQueryDto>,
  ): Promise<SelectQueryBuilder<Subject>> {
    if (filters.userId) {
      const user = await this.userService.findUserById(filters.userId);
      if (user?.userType === UserType.TEACHER) {
        query.andWhere('teacher.userId = :userId', { userId: filters.userId });
      }
    }

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
    if (updateSubjectDto.teacherId) {
      const subjectTeacher: SubjectTeacher = {
        subjectId: subject.id,
        teacherId: updateSubjectDto.teacherId,
        status: SubjectTeacherStatus.ACTIVE,
      };
      await this.createSubjectTeacher(subjectTeacher);
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

  async getSubjectCount(teacherId?: number): Promise<number> {
    if (teacherId) {
      return await this.subjectTeacherRepo.count({
        where: { teacherId, status: SubjectTeacherStatus.ACTIVE },
      });
    }
    return await this.subjectRepo.count();
  }

  //teacher subjects assigned
  async getAssignedSubjectsId(
    teacherId?: number,
  ): Promise<Partial<SubjectTeacher>[]> {
    return await this.subjectTeacherRepo.find({
      where: { teacherId, status: SubjectTeacherStatus.ACTIVE },
      select: ['subjectId'],
    });
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

    await this.applyFilters(query, subjectListingQueryDto);
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

  async createSubjectTeacher(subjectTeacher: SubjectTeacher): Promise<boolean> {
    const existing = await this.subjectTeacherRepo.findOne({
      where: {
        subjectId: subjectTeacher.subjectId,
        status: SubjectTeacherStatus.ACTIVE,
      },
    });
    if (existing?.teacherId === subjectTeacher.teacherId) return true;

    if (existing && existing.teacherId !== subjectTeacher.teacherId) {
      existing.status = SubjectTeacherStatus.OLD;
      await this.subjectTeacherRepo.save(existing);
    }

    return !!(await this.subjectTeacherRepo.save(
      this.subjectTeacherRepo.create(subjectTeacher),
    ));
  }

  async getAllSubjectListWithEvalParams(
    subjectEvaluationMarksQueryDto: SubjectEvaluationMarksQueryDto,
  ): Promise<{
    data: SubjectResponse[];
  }> {
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
        'st.id',
        'teacher.id',
        'teacher.firstName',
        'teacher.lastName',
      ]);

    await this.applyFilters(query, subjectEvaluationMarksQueryDto);
    const subjects = this.denormalizeSubjects(await query.getMany());

    const subjectsWithParams = await Promise.all(
      subjects.map(async (subject) => {
        const params =
          await this.evaluationParameterService.getAllParameterList({
            subjectId: subject.id,
            type: 'assigned',
          });

        return {
          ...subject,
          evaluationParameters: params.data,
        };
      }),
    );

    return {
      data: subjectsWithParams,
    };
  }

  async getSubjectsInternal(
    subjectFilter: SubjectInternal,
  ): Promise<SubjectInternalResponse[]> {
    const { programId, semester } = subjectFilter;

    const whereCondition: any = { programId };
    if (semester) {
      whereCondition.semester = LessThanOrEqual(semester);
    }

    return await this.subjectRepo.find({
      where: whereCondition,
      select: ['id', 'name', 'code', 'semester'], // semester added
      order: { semester: 'ASC' },
    });
  }

  async getAssignedProgramAndSemester(
    userId: number,
    type?: string,
  ): Promise<ProgramSemesterPair[] | ProgramSemesterDashboard[]> {
    const baseQuery = this.subjectRepo
      .createQueryBuilder('subject')
      .innerJoin('subject.subjectTeacher', 'st')
      .innerJoin('subject.program', 'program')
      .innerJoin('st.teacher', 'teacher')
      .where('teacher.userId = :userId', { userId })
      .andWhere('st.status = :status', { status: SubjectTeacherStatus.ACTIVE });

    if (!type) {
      const results = await baseQuery
        .select('subject.programId', 'programId')
        .addSelect('subject.semester', 'semester')
        .groupBy('subject.programId')
        .addGroupBy('subject.semester')
        .getRawMany();

      return results.map(
        (r): ProgramSemesterPair => ({
          programId: r.programId,
          semester: r.semester,
        }),
      );
    }

    const results = await baseQuery
      .select('subject.programId', 'programId')
      .addSelect('program.name', 'programName')
      .addSelect('program.code', 'programCode')
      .addSelect('subject.semester', 'semester')
      .addSelect('COUNT(subject.id)', 'subjectCount')
      .groupBy('subject.programId')
      .addGroupBy('program.name')
      .addGroupBy('program.code')
      .addGroupBy('subject.semester')
      .getRawMany();

    const programMap = new Map<number, ProgramSemesterDashboard>();

    results.forEach((r) => {
      if (!programMap.has(r.programId)) {
        programMap.set(r.programId, {
          programId: r.programId,
          programName: r.programName,
          programCode: r.programCode,
          semesters: [],
        });
      }
      programMap.get(r.programId)!.semesters.push({
        semester: Number(r.semester),
        subjectCount: Number(r.subjectCount),
      });
    });

    return Array.from(programMap.values());
  }
}
