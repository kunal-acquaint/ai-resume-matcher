import { BadRequestException, Injectable, type PipeTransform } from '@nestjs/common';
import { isValidObjectId } from 'mongoose';

/** Rejects route params that are not valid MongoDB ObjectIds with a 400 instead of a 500 cast error. */
@Injectable()
export class ParseObjectIdPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (!isValidObjectId(value)) {
      throw new BadRequestException('Invalid id');
    }
    return value;
  }
}
