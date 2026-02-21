import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EvaluationParameter } from 'src/database/entities/evaluation-parameter.entity';
import { SubjectsEvaluationParameter } from 'src/database/entities/subject-evaluation-parameter.entity';
import { Brackets, Repository } from 'typeorm';
import {
  CreateEvaluationParamDto,
  EvaluationParamQueryDto,
  ParameterListingQuery,
  UpdateEvaluationParamDto,
} from './dto/evaluation-parameters.dto';
import { AssignSubjectEvaluationParamsDto } from './dto/subject-evaluation-parameters.dto';
import { EvaluationParameterListing } from './interfaces/evaluation-parameter.interface';

@Injectable()
export class EvaluationParametersService {
  constructor(
    @InjectRepository(EvaluationParameter)
    private readonly evaluationParamRepository: Repository<EvaluationParameter>,

    @InjectRepository(SubjectsEvaluationParameter)
    private readonly subjectParamRepository: Repository<SubjectsEvaluationParameter>,
  ) {}

  async createEvaluationParameters(
    createEvaluationParamDto: CreateEvaluationParamDto,
  ): Promise<Boolean> {
    const exists = await this.checkDuplicate(createEvaluationParamDto.code);
    if (exists)
      throw new ConflictException(
        `Parameter already exists for Code: ${createEvaluationParamDto.code}.`,
      );
    const evaluationParam = this.evaluationParamRepository.create(
      createEvaluationParamDto,
    );
    return !!(await this.evaluationParamRepository.save(evaluationParam));
  }

  async remove(id: number): Promise<Boolean> {
    const evaluationParam = await this.evaluationParamRepository.findOne({
      where: { id },
    });
    if (!evaluationParam)
      throw new NotFoundException(`Parameter with id: ${id} doesn't exists.`);
    return !!this.evaluationParamRepository.softRemove(evaluationParam);
  }

  async findAll(evaluationParamQueryDto: EvaluationParamQueryDto): Promise<{
    data: EvaluationParameter[];
    total?: number;
    page?: number;
    limit?: number;
    lastPage?: number;
  }> {
    const { page = 1, limit = 10, ...filters } = evaluationParamQueryDto;
    const query =
      this.evaluationParamRepository.createQueryBuilder('parameter');

    if (filters?.search) {
      query.andWhere(
        new Brackets((qb) => {
          qb.where('parameter.name LIKE :search', {
            search: `%${filters.search}%`,
          }).orWhere('parameter.code LIKE :search', {
            search: `%${filters.search}%`,
          });
        }),
      );
    }
    query.andWhere('parameter.deletedAt IS NULL');
    query.select(EvaluationParameter.ALLOWED_FIELDS_LIST);
    query.skip((page - 1) * limit).take(limit);
    query.orderBy('parameter.name', 'ASC');
    const [data, total] = await query.getManyAndCount();
    const lastPage = Math.ceil(total / limit);

    return { data, total, page, limit, lastPage };
  }

  async update(
    id: number,
    updateEvaluationParamDto: UpdateEvaluationParamDto,
  ): Promise<Boolean> {
    const parameter = await this.evaluationParamRepository.findOne({
      where: { id },
    });
    if (!parameter)
      throw new NotFoundException(`Parameter with id: ${id} doesn't exists.`);

    if (
      updateEvaluationParamDto.code &&
      updateEvaluationParamDto.code !== parameter.code
    ) {
      const exists = await this.checkDuplicate(updateEvaluationParamDto.code);

      if (exists) {
        throw new ConflictException(
          `Parameter with code: ${updateEvaluationParamDto.code} already exists.`,
        );
      }
    }

    Object.assign(parameter, updateEvaluationParamDto);
    return !!(await this.evaluationParamRepository.save(parameter));
  }

  async getAllParameterList(
    parameterListingQuery: ParameterListingQuery,
  ): Promise<{ data: EvaluationParameterListing[] }> {
    const query = this.evaluationParamRepository
      .createQueryBuilder('parameter')
      .select([
        'parameter.id AS id',
        'parameter.code AS code',
        'parameter.name AS name',
      ]);

    if (parameterListingQuery?.search) {
      query.andWhere(
        new Brackets((qb) => {
          qb.where('parameter.name LIKE :search', {
            search: `%${parameterListingQuery.search}%`,
          }).orWhere('parameter.code LIKE :search', {
            search: `%${parameterListingQuery.search}%`,
          });
        }),
      );
    }
    const isSubjectProvided = !!parameterListingQuery.subjectId;

    if (isSubjectProvided) {
      query
        .leftJoin(
          'subjects_evaluation_parameters',
          'sp',
          'sp.evaluation_parameter_id = parameter.id AND sp.subject_id = :subjectId',
          { subjectId: parameterListingQuery.subjectId },
        )
        .addSelect(
          `CASE 
          WHEN sp.id IS NOT NULL THEN 1 
          ELSE 0 
        END`,
          'assigned',
        )
        .addSelect('sp.weight', 'weight');

      if (parameterListingQuery.type) {
        if (parameterListingQuery.type === 'assigned') {
          query.andWhere('sp.id IS NOT NULL');
        } else if (parameterListingQuery.type === 'unassigned') {
          query.andWhere('sp.id IS NULL');
        }
      }
    }

    const rawData = await query.getRawMany();

    const data = rawData.map((row) => {
      if (isSubjectProvided) {
        return {
          ...row,
          assigned: Number(row.assigned),
          weight:
            row.weight !== null && row.weight !== undefined
              ? Number(row.weight)
              : 0,
        };
      }

      return {
        id: row.id,
        code: row.code,
        name: row.name,
      };
    });

    return { data };
  }

  async checkDuplicate(code: string): Promise<Boolean> {
    return !!(await this.evaluationParamRepository.findOne({
      where: { code },
    }));
  }

  async assignSubjectEvaluationParams(
    assignDto: AssignSubjectEvaluationParamsDto,
  ): Promise<boolean> {
    const { subjectId, parameters } = assignDto;

    const toDelete: number[] = [];
    const toInsertOrUpdate: SubjectsEvaluationParameter[] = [];

    const existing = await this.subjectParamRepository.find({
      where: { subjectId },
    });

    const existingMap = new Map(
      existing.map((e) => [e.evaluationParameterId, e]),
    );

    for (const param of parameters) {
      const { evaluationParameterId, weight } = param;

      const found = existingMap.get(evaluationParameterId);
      if (!found) {
        toInsertOrUpdate.push(
          this.subjectParamRepository.create({
            subjectId,
            evaluationParameterId,
            weight,
          }),
        );
      } else if (found.weight! - weight) {
        found.weight = weight;
        toInsertOrUpdate.push(found);
      }
      existingMap.delete(evaluationParameterId);
    }
    for (const leftover of existingMap.values()) {
      toDelete.push(leftover.id);
    }
    if (toDelete.length > 0) {
      return !!(await this.subjectParamRepository.delete(toDelete));
    }
    if (toInsertOrUpdate.length > 0) {
      return !!(await this.subjectParamRepository.save(toInsertOrUpdate));
    }
    return true;
  }

  async checkSubjectParamExists(
    subjectId: number,
    evaluationParameterId: number,
  ): Promise<SubjectsEvaluationParameter | null> {
    return await this.subjectParamRepository.findOne({
      where: { subjectId, evaluationParameterId },
    });
  }
}
