import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import {
  CreateEvaluationParamDto,
  EvaluationParamQueryDto,
  ParameterListingQuery,
} from './dto/evaluation-parameters.dto';
import { EvaluationParametersService } from './evaluation-parameters.service';
import { ApiResponse } from 'utils/api-response';
import { AssignSubjectEvaluationParamsDto } from './dto/subject-evaluation-parameters.dto';

@Controller('evaluation-parameters')
export class EvaluationParametersController {
  constructor(
    private readonly evaluationParameterService: EvaluationParametersService,
  ) {}
  @HttpCode(201)
  @Post()
  async create(@Body() createEvaluationParamDto: CreateEvaluationParamDto) {
    await this.evaluationParameterService.createEvaluationParameters(
      createEvaluationParamDto,
    );
    return ApiResponse.success(
      'Evaluation parameters saved successfully.',
      201,
    );
  }

  @HttpCode(200)
  @Get()
  async findAll(@Query() evaluationParamQueryDto: EvaluationParamQueryDto) {
    const parameters = await this.evaluationParameterService.findAll(
      evaluationParamQueryDto,
    );
    return ApiResponse.successData(
      parameters,
      'Parameters fetched successfully.',
      200,
    );
  }

  @HttpCode(200)
  @Delete()
  async remove(@Param('id') id: string) {
    await this.evaluationParameterService.remove(+id);
    return ApiResponse.success('Parameter removed successfully.', 200);
  }

  @Get('parameter-list')
  @HttpCode(200)
  async getAllProgramssList(
    @Query() parameterListingQuery: ParameterListingQuery,
  ) {
    const parameterList =
      await this.evaluationParameterService.getAllParameterList(
        parameterListingQuery,
      );
    return ApiResponse.successData(
      parameterList,
      'Evaluation Parameter list fetched successfully.',
      200,
    );
  }

  @Post('assign')
  @HttpCode(201)
  async assignSubjectEvaluationParam(
    @Body() assignSubjectEvaluationParamDto: AssignSubjectEvaluationParamsDto,
  ) {
    await this.evaluationParameterService.assignSubjectEvaluationParams(
      assignSubjectEvaluationParamDto,
    );
    return ApiResponse.success(
      'Evaluation parameter configured successfully.',
      201,
    );
  }
}
