export interface duplicateEvaluationParameter {
  field: number;
  message: string;
}

export interface EvaluationParameterListing {
  id: number;
  name: string;
  code: string;
  weight: number;
  assigned?: number;
}
