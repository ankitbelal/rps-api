import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EvaluationParameter } from 'src/database/entities/evaluation-parameter.entity';
import { ExtraParametersMarks } from 'src/database/entities/extra-parameters-marks.entity';
import { SubjectsEvaluationParameter } from 'src/database/entities/subject-evaluation-parameter.entity';
import { Repository } from 'typeorm';
import {
  CreateEvaluationParamDto,
  EvaluationParamQueryDto,
  ParameterListingQuery,
  UpdateEvaluationParamDto,
} from './dto/evaluation-parameters.dto';
import { AssignSubjectEvaluationParamsDto } from './dto/subject-evaluation-parameters.dto';
import { duplicateEvaluationParameter } from './interfaces/evaluation-parameter.interface';

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
  ): Promise<{ data: EvaluationParameter[] }> {
    const query = this.evaluationParamRepository
      .createQueryBuilder('parameter')
      .select(['parameter.id', 'parameter.name']);

    if (parameterListingQuery.code) {
      query.andWhere('program.code LIKE :code', {
        code: `%${parameterListingQuery.code}%`,
      });
    }
    // if(parameterListingQuery.subjectId){
    // const assignedParameters=

    // }
    const data = await query.getMany();
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
}
