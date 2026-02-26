import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
  registerDecorator,
  ValidationOptions,
} from 'class-validator';
import { CreateGradeRangeDto } from '../dto/result.dto';

@ValidatorConstraint({ name: 'NoOverlappingRanges', async: false })
export class NoOverlappingRangesConstraint
  implements ValidatorConstraintInterface
{
  validate(gradeRanges: CreateGradeRangeDto[], args: ValidationArguments) {
    if (!gradeRanges || gradeRanges.length === 0) return true;

    // check duplicate minGPA
    const minGPAs = gradeRanges.map((r) => Number(r.minGPA));
    const uniqueMinGPAs = new Set(minGPAs);
    if (minGPAs.length !== uniqueMinGPAs.size) return false;

    // check duplicate maxGPA
    const maxGPAs = gradeRanges.map((r) => Number(r.maxGPA));
    const uniqueMaxGPAs = new Set(maxGPAs);
    if (maxGPAs.length !== uniqueMaxGPAs.size) return false;

    // sort by minGPA
    const sorted = [...gradeRanges].sort(
      (a, b) => Number(a.minGPA) - Number(b.minGPA),
    );

    for (let i = 0; i < sorted.length; i++) {
      const current = sorted[i];

      // min cannot be greater than or equal to max
      if (Number(current.minGPA) >= Number(current.maxGPA)) {
        return false;
      }

      // check overlap with next range
      if (i < sorted.length - 1) {
        const next = sorted[i + 1];
        if (Number(current.maxGPA) > Number(next.minGPA)) {
          return false;
        }
      }
    }

    return true;
  }

  defaultMessage(args: ValidationArguments) {
    const gradeRanges = args.value as CreateGradeRangeDto[];

    // duplicate minGPA message
    const minGPAs = gradeRanges.map((r) => Number(r.minGPA));
    const duplicateMin = minGPAs.find((val, i) => minGPAs.indexOf(val) !== i);
    if (duplicateMin !== undefined) {
      return `Duplicate minGPA value found: ${duplicateMin}`;
    }

    // duplicate maxGPA message
    const maxGPAs = gradeRanges.map((r) => Number(r.maxGPA));
    const duplicateMax = maxGPAs.find((val, i) => maxGPAs.indexOf(val) !== i);
    if (duplicateMax !== undefined) {
      return `Duplicate maxGPA value found: ${duplicateMax}`;
    }

    const sorted = [...gradeRanges].sort(
      (a, b) => Number(a.minGPA) - Number(b.minGPA),
    );

    for (let i = 0; i < sorted.length; i++) {
      const current = sorted[i];

      if (Number(current.minGPA) >= Number(current.maxGPA)) {
        return `Grade ${current.grade}: minGPA (${current.minGPA}) must be less than maxGPA (${current.maxGPA})`;
      }

      if (i < sorted.length - 1) {
        const next = sorted[i + 1];
        if (Number(current.maxGPA) > Number(next.minGPA)) {
          return `Grade ${current.grade} (${current.minGPA}-${current.maxGPA}) overlaps with Grade ${next.grade} (${next.minGPA}-${next.maxGPA})`;
        }
      }
    }

    return 'Grade ranges are overlapping or invalid';
  }
}

// decorator
export function NoOverlappingRanges(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: NoOverlappingRangesConstraint,
    });
  };
}
