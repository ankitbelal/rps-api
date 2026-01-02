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
  UpdateEvaluationParamDto,
} from './dto/evaluation-parameters.dto';

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
    const exists = await this.evaluationParamRepository.findOne({
      where: { parameterCode: createEvaluationParamDto.parameterCode },
    });
    if (exists)
      throw new ConflictException(
        `Parameter already exists for Code: ${createEvaluationParamDto.parameterCode}.`,
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

    if (filters?.parameterName)
      query.andWhere('parameter.parameter_name LIKE :name', {
        name: `%${filters.parameterName}%`,
      });

    if (filters?.parameterCode)
      query.andWhere('parameter.parameter_code = :code', {
        code: filters.parameterCode,
      });

    query.select(EvaluationParameter.ALLOWED_FIELDS_LIST);
    query.skip((page - 1) * limit).take(limit);
    query.orderBy('parameter.parameter_name', 'ASC');
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
      id != parameter.id &&
      parameter.parameterCode == updateEvaluationParamDto.parameterCode
    ) {
      throw new ConflictException(
        `Program already exists for Code: ${updateEvaluationParamDto.parameterCode}.`,
      );
    }
    Object.assign(parameter, updateEvaluationParamDto);
    return !!(await this.evaluationParamRepository.save(parameter));
  }
}
