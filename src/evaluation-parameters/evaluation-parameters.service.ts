import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EvaluationParameter } from 'src/database/entities/evaluation-parameter.entity';
import { ExtraParametersMarks } from 'src/database/entities/extra-parameters-marks.entity';
import { SubjectsEvaluationParameter } from 'src/database/entities/subject-evaluation-parameter.entity';
import { Brackets, Repository } from 'typeorm';
import {
  CreateEvaluationParamDto,
  EvaluationParamQueryDto,
  ParameterListingQuery,
  UpdateEvaluationParamDto,
} from './dto/evaluation-parameters.dto';
import { AssignSubjectEvaluationParamsDto } from './dto/subject-evaluation-parameters.dto';
import {
  duplicateEvaluationParameter,
  EvaluationParameterListing,
} from './interfaces/evaluation-parameter.interface';

@Injectable()
export class EvaluationParametersService {
  constructor(
    @InjectRepository(EvaluationParameter)
    private readonly evaluationParamRepository: Repository<EvaluationParameter>,

    @InjectRepository(ExtraParametersMarks)
    private readonly extraParamRepository: Repository<ExtraParametersMarks>,

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
    return !!this.evaluationParamRepository.remove(evaluationParam);
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

    if (filters?.name)
      query.andWhere('parameter.name LIKE :name', {
        name: `%${filters.name}%`,
      });

    if (filters?.code)
      query.andWhere('parameter.code = :code', {
        code: filters.code,
      });

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

    const conflicts: duplicateEvaluationParameter[] = [];

    for (const param of parameters) {
      const { evaluationParameterId } = param;

      const existing = await this.subjectParamRepository.findOne({
        where: { subjectId, evaluationParameterId },
      });

      if (existing) {
        conflicts.push({
          field: param.evaluationParameterId,
          message: `Evaluation parameter already exists for subject.`,
        });
      }
    }

    if (conflicts.length > 0) {
      throw new ConflictException({ errors: conflicts });
    }

    const paramsToInsert = parameters.map((param) => ({
      subjectId,
      evaluationParameterId: param.evaluationParameterId,
      weight: param.weight,
    }));

    return !!(await this.subjectParamRepository.save(paramsToInsert));
  }

  // async assignSubjectEvaluationParams(
  //   assignDto: AssignSubjectEvaluationParamsDto,
  // ): Promise<boolean> {
  //   const { subjectId, parameters } = assignDto;

  //   const existing = await this.subjectParamRepository.find({
  //     where: { subjectId },
  //   });

  //   const existingMap = new Map(
  //     existing.map((e) => [e.evaluationParameterId, e]),
  //   );

  //   const toInsert = [];
  //   const toDeleteIds = [];

  //   for (const param of parameters) {
  //     const { evaluationParameterId, weight, assigned } = param;
  //     const alreadyExists = existingMap.get(evaluationParameterId);

  //     if (assigned === 1) {
  //       if (!alreadyExists) {
  //         toInsert.push({
  //           subjectId,
  //           evaluationParameterId,
  //           weight,
  //         });
  //       } else if (alreadyExists.weight !== weight) {
  //         alreadyExists.weight = weight;
  //         toInsert.push(alreadyExists);
  //       }
  //     }

  //     // ❌ assign = false → ensure removed
  //     if (assign === false && alreadyExists) {
  //       toDeleteIds.push(alreadyExists.id);
  //     }
  //   }

  //   // 2️⃣ Apply DB changes
  //   if (toDeleteIds.length > 0) {
  //     await this.subjectParamRepository.delete(toDeleteIds);
  //   }

  //   if (toInsert.length > 0) {
  //     await this.subjectParamRepository.save(toInsert);
  //   }

  //   return true;
  // }
}
