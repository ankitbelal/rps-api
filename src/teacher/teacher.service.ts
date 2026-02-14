import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AssignSubjectDto,
  CreateTeacherDto,
  SearchTeacherListDto,
  TeacherQueryDto,
  UpdateTeacherDto,
} from './dto/teacher.dto';
import { Teacher } from 'src/database/entities/teacher.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { UserService } from 'src/user/user.service';
import { UserStatus, UserType } from 'utils/enums/general-enums';
import { SelectQueryBuilder } from 'typeorm/browser';
import { UserSync } from 'src/user/interfaces/user-interface';
import { User } from 'src/database/entities/user.entity';
import { SubjectService } from 'src/subject/subject.service';
import * as ExcelJS from 'exceljs';
import { join } from 'path';
import { Response } from 'express';

@Injectable()
export class TeacherService {
  constructor(
    @InjectRepository(Teacher)
    private readonly teacherRepo: Repository<Teacher>,
    private readonly userService: UserService,
    private readonly subjectService: SubjectService,
  ) {}
  async create(createTeacherDto: CreateTeacherDto): Promise<Boolean> {
    const { emailUsed, phoneUsed, valid } =
      await this.validateTeacherContact(createTeacherDto);

    if (!valid) {
      const errors: any = {};
      if (emailUsed) errors.email = 'Already used.';
      if (phoneUsed) errors.phone = 'Already used.';

      throw new ConflictException({
        success: false,
        statusCode: 409,
        message: 'Validation failed',
        errors,
      });
    }
    const teacherData: Partial<Teacher> = { ...createTeacherDto };

    if (createTeacherDto.createUser) {
      teacherData.userId = (await this.createUser(createTeacherDto)).id;
    }
    return !!(await this.teacherRepo.save(
      this.teacherRepo.create(teacherData),
    ));
  }

  async findAll(teacherQueryDto: TeacherQueryDto): Promise<{
    data: Teacher[];
    total?: number;
    page?: number;
    lastPage?: number;
    limit?: number;
  }> {
    const { page = 1, limit = 10, ...filters } = teacherQueryDto;
    const query = this.teacherRepo.createQueryBuilder('teacher');
    if (filters?.id) {
      query.andWhere('teacher.id = :id', { id: filters.id });
      query.select(Teacher.ALLOWED_DETAILS);
      const data = await query.getOne();
      if (!data)
        throw new NotFoundException({
          statusCode: 404,
          message: `Teacher with id: ${filters.id} does not exists`,
        });
      return { data: [data] };
    }
    const filteredquery = this.applyFilters(query, filters);
    filteredquery.andWhere('teacher.deletedAt IS NULL');
    filteredquery.select(Teacher.ALLOWED_FIELDS_LIST);
    filteredquery.skip((page - 1) * limit).take(limit);
    filteredquery.orderBy('teacher.firstName', 'ASC');
    const [data, total] = await filteredquery.getManyAndCount();
    const lastPage = Math.ceil(total / limit);
    return { data, total, page, lastPage, limit };
  }

  private applyFilters(
    query: SelectQueryBuilder<Teacher>,
    filters: Partial<TeacherQueryDto>,
  ): SelectQueryBuilder<Teacher> {
    if (filters?.gender) {
      query.andWhere('teacher.gender = :gender', { gender: filters.gender });
    }
    if (filters?.search) {
      query.andWhere(
        new Brackets((qb) => {
          qb.where('teacher.first_name LIKE :search', {
            search: `%${filters.search}%`,
          })
            .orWhere('teacher.last_name LIKE :search', {
              search: `%${filters.search}%`,
            })
            .orWhere('teacher.email = :search', {
              search: `%${filters.search}%`,
            })
            .orWhere('teacher.phone = :search', {
              search: `%${filters.search}%`,
            });
        }),
      );
    }
    return query;
  }

  async update(
    id: number,
    updateTeacherDto: UpdateTeacherDto,
  ): Promise<Boolean> {
    const teacher = await this.teacherRepo.findOne({ where: { id } });
    if (!teacher) {
      throw new NotFoundException({
        status: 'false',
        statusCode: 404,
        message: `Teacher with id: ${id} does not exists.`,
      });
    }
    const isEmailChanged =
      updateTeacherDto.email && updateTeacherDto.email !== teacher.email;

    const isPhoneChanged =
      updateTeacherDto.phone && updateTeacherDto.phone !== teacher.phone;

    if (isEmailChanged || isPhoneChanged) {
      const { emailUsed, phoneUsed, valid } =
        await this.validateTeacherContact(updateTeacherDto);

      if (!valid) {
        const errors: any = {};
        if (emailUsed && updateTeacherDto.email !== teacher.email)
          errors.email = 'Already used';
        if (phoneUsed && updateTeacherDto.phone !== teacher.phone)
          errors.phone = 'Already used';

        if (Object.keys(errors).length > 0) {
          throw new ConflictException({
            success: false,
            statusCode: 409,
            message: 'Validation failed',
            errors,
          });
        }
      }
    }
    await this.syncWithUser(updateTeacherDto, teacher);
    Object.assign(teacher, updateTeacherDto);
    return !!(await this.teacherRepo.save(teacher));
  }

  async remove(id: number): Promise<Boolean> {
    const teacher = await this.teacherRepo.findOne({ where: { id } });
    if (!teacher)
      throw new NotFoundException({
        status: 'false',
        statusCode: 404,
        message: `Teacher with id: ${id} does not exists.`,
      });
    return !!(await this.teacherRepo.softRemove(teacher));
  }

  async validateTeacherContact(data: {
    email?: string;
    phone?: string;
  }): Promise<{
    emailUsed: boolean;
    phoneUsed: boolean;
    valid: boolean;
  }> {
    let emailUsed = false;
    let phoneUsed = false;

    if (data.email) {
      const email = await this.teacherRepo.findOne({
        where: { email: data.email },
      });
      emailUsed = !!email;
    }

    if (data.phone) {
      const phone = await this.teacherRepo.findOne({
        where: { phone: data.phone },
      });
      phoneUsed = !!phone;
    }
    const valid = !emailUsed && !phoneUsed;
    return { emailUsed, phoneUsed, valid };
  }
  async getAllTeachersList(
    searchTeacherListDto: SearchTeacherListDto,
  ): Promise<{ data: Teacher[] }> {
    const query = this.teacherRepo
      .createQueryBuilder('teacher')
      .select('teacher.id', 'id')
      .addSelect("CONCAT(teacher.first_name, ' ', teacher.last_name)", 'name')
      .andWhere('teacher.deletedAt IS NULL');

    if (searchTeacherListDto?.name) {
      const parts = searchTeacherListDto.name.trim().split(/\s+/);

      if (parts.length === 1) {
        query.andWhere(
          '(teacher.firstName LIKE :name OR teacher.lastName LIKE :name)',
          { name: `%${parts[0]}%` },
        );
      } else {
        query.andWhere(
          '(teacher.firstName LIKE :first AND teacher.lastName LIKE :last)',
          {
            first: `%${parts[0]}%`,
            last: `%${parts[1]}%`,
          },
        );
      }
    }
    const data = await query.getRawMany();
    return { data };
  }

  async getTeachersCount(): Promise<number> {
    return await this.teacherRepo.count();
  }

  async syncWithUser(
    dto: UpdateTeacherDto,
    teacher?: Teacher | null,
  ): Promise<boolean> {
    const userSync: UserSync = {};
    userSync.id = teacher?.userId;

    if (
      (dto.firstName || dto.lastName) &&
      (dto.firstName !== teacher?.firstName ||
        dto.lastName !== teacher?.lastName)
    ) {
      userSync.name = dto.firstName + ' ' + dto.lastName;
    }

    if (dto.email && dto.email !== teacher?.email) {
      userSync.email = dto.email;
    }
    if (Object.keys(userSync).length > 1)
      return !!(await this.userService.createUser(userSync));
    return true;
  }

  async createUser(dto: CreateTeacherDto): Promise<User> {
    const userSync: UserSync = {
      name: dto.firstName + ' ' + dto.lastName,
      email: dto.email,
      userType: UserType.TEACHER,
      status: UserStatus.ACTIVE,
    };
    return await this.userService.createUser(userSync);
  }

  async assignSubjects(assignSubjectDto: AssignSubjectDto) {
    const teacher = await this.teacherRepo.findOne({
      where: { id: assignSubjectDto.teacherId },
    });
    if (!teacher) return new NotFoundException('Teacher does not exists.');

    return await this.subjectService.assignSubjectTeacher(assignSubjectDto);
  }

  async generateExcelReport(
    teacherQueryDto: TeacherQueryDto,
    res: Response,
  ): Promise<void> {
    const { id, gender, search } = teacherQueryDto;

    // Fetch teachers with filters
    const query = this.teacherRepo.createQueryBuilder('teacher');

    const filteredQuery = this.applyFilters(query, teacherQueryDto);
    filteredQuery.andWhere('teacher.deletedAt IS NULL');
    filteredQuery.orderBy('teacher.firstName', 'ASC');

    const teachers = await filteredQuery.getMany();

    if (!teachers.length) {
      throw new NotFoundException('No data found to export.');
    }

    // Create workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'LMS System';
    workbook.lastModifiedBy = 'LMS System';
    workbook.created = new Date();
    workbook.modified = new Date();

    const worksheet = workbook.addWorksheet('Teachers Report', {
      properties: { tabColor: { argb: 'FF244062' } },
      pageSetup: { paperSize: 9, orientation: 'landscape' },
    });

    // Define columns for teacher report
    worksheet.columns = [
      { header: 'ID', key: 'id', width: 8 },
      { header: 'Full Name', key: 'name', width: 25 },
      { header: 'Gender', key: 'gender', width: 8 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Phone', key: 'phone', width: 15 },
      { header: 'Date of Birth', key: 'dob', width: 15 },
      { header: 'Join Date', key: 'joinDate', width: 15 },
      { header: 'Address 1', key: 'address1', width: 25 },
      { header: 'Address 2', key: 'address2', width: 25 },
    ];

    const lastCol = 'I'; // 9 columns (A to I)
    let currentRow = 1;

    // ================= HEADER SECTION WITH LOGO =================
    const headerRows = 12;
    worksheet.mergeCells(
      `A${currentRow}:${lastCol}${currentRow + headerRows - 1}`,
    );
    const headerCell = worksheet.getCell(`A${currentRow}`);

    // Style the header background - LIGHT YELLOW
    headerCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFF9E6' }, // Light yellow background
    };

    headerCell.border = {
      top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      right: { style: 'thin', color: { argb: 'FFCCCCCC' } },
    };

    // Add logo at top center - ROUND LOGO
    const logoPath = join(process.cwd(), 'src', 'assets', 'lms-logo.png');
    const fs = require('fs');

    if (fs.existsSync(logoPath)) {
      const logoImageId = workbook.addImage({
        filename: logoPath,
        extension: 'png',
      });

      worksheet.addImage(logoImageId, {
        tl: { col: 4.5, row: 0.5 }, // Exact center column
        ext: { width: 100, height: 100 },
        editAs: 'oneCell',
      });
    }

    // ================= DYNAMIC HEADER TEXT WITH COLORS =================
    const richText: ExcelJS.RichText[] = [];

    // Add line breaks for logo spacing (5 line breaks)
    richText.push({
      font: {
        name: 'Calibri',
        size: 20,
        bold: true,
        color: { argb: 'FF008080' },
      },
      text: '\n\n\n\n\n',
    });

    // First line - Dark teal
    richText.push({
      font: {
        name: 'Calibri',
        size: 20,
        bold: true,
        color: { argb: 'FF008080' },
      },
      text: 'RESULT PROCESSING SYSTEM - LMS\n',
    });

    // Second line - Dark blue
    let secondLineText = 'Teacher Report';
    if (gender) {
      secondLineText = `${gender === 'M' ? 'Male' : gender === 'F' ? 'Female' : 'Other'} Teachers`;
    }

    richText.push({
      font: {
        name: 'Calibri',
        size: 18,
        bold: true,
        color: { argb: 'FF00008B' },
      },
      text: secondLineText + '\n',
    });

    // Third line - Dark red
    let thirdLineText = 'All Teachers';
    if (search) {
      thirdLineText = `Matching "${search}"`;
    }

    richText.push({
      font: {
        name: 'Calibri',
        size: 18,
        bold: true,
        color: { argb: 'FF8B0000' },
      },
      text: thirdLineText,
    });

    headerCell.value = { richText };
    headerCell.alignment = {
      horizontal: 'center',
      vertical: 'bottom',
      wrapText: true,
    };

    // Move past header
    currentRow += headerRows;

    // ================= TWO BLANK WHITE ROWS (MERGED) BEFORE TABLE =================
    // First blank white row
    const firstBlankRow = worksheet.getRow(currentRow);
    worksheet.mergeCells(`A${currentRow}:${lastCol}${currentRow}`);
    firstBlankRow.getCell(1).value = '';
    firstBlankRow.height = 15;

    for (let i = 1; i <= 9; i++) {
      const cell = firstBlankRow.getCell(i);
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFFFFF' },
      };
      cell.border = {
        left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        right: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      };
    }
    currentRow++;

    // Second blank white row
    const secondBlankRow = worksheet.getRow(currentRow);
    worksheet.mergeCells(`A${currentRow}:${lastCol}${currentRow}`);
    secondBlankRow.getCell(1).value = '';
    secondBlankRow.height = 15;

    for (let i = 1; i <= 9; i++) {
      const cell = secondBlankRow.getCell(i);
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFFFFF' },
      };
      cell.border = {
        left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        right: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      };
    }
    currentRow++;

    // ================= TABLE HEADER WITH AUTO FILTER =================
    const headerRow = worksheet.getRow(currentRow);
    headerRow.values = worksheet.columns.map((col) => col.header as string);
    headerRow.height = 25;

    headerRow.eachCell((cell) => {
      cell.font = {
        bold: true,
        size: 11,
        color: { argb: 'FFFFFFFF' },
        name: 'Calibri',
      };
      cell.alignment = {
        horizontal: 'center',
        vertical: 'middle',
      };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF244062' },
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } },
      };
    });

    worksheet.autoFilter = {
      from: { row: currentRow, column: 1 },
      to: { row: currentRow, column: 9 },
    };

    const tableStartRow = currentRow;
    currentRow++;

    // ================= DATA ROWS =================
    teachers.forEach((teacher, index) => {
      const row = worksheet.getRow(currentRow);

      row.getCell(1).value = teacher.id;

      // Full Name
      const fullName =
        `${teacher.firstName || ''} ${teacher.lastName || ''}`.trim();
      row.getCell(2).value = fullName;

      // Gender
      row.getCell(3).value = teacher.gender || '';

      // Email
      row.getCell(4).value = teacher.email || '';

      // Phone
      row.getCell(5).value = teacher.phone || '';

      // Date of Birth
      row.getCell(6).value = teacher.DOB
        ? new Date(teacher.DOB).toLocaleDateString('en-US', {
            month: '2-digit',
            day: '2-digit',
            year: 'numeric',
          })
        : '';

      // Join Date (using createdAt from entity)
      row.getCell(7).value = teacher.createdAt
        ? new Date(teacher.createdAt).toLocaleDateString('en-US', {
            month: '2-digit',
            day: '2-digit',
            year: 'numeric',
          })
        : '';

      // Address 1
      row.getCell(8).value =
        teacher.address1 && teacher.address1.trim()
          ? teacher.address1.trim()
          : '';

      // Address 2
      row.getCell(9).value =
        teacher.address2 && teacher.address2.trim()
          ? teacher.address2.trim()
          : '';

      row.height = 20;

      for (let i = 1; i <= 9; i++) {
        const cell = row.getCell(i);

        // Center alignment for specific columns (ID, Gender, DOB, Join Date)
        if (i === 1 || i === 3 || i === 6 || i === 7) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        } else {
          cell.alignment = { horizontal: 'left', vertical: 'middle' };
        }

        cell.border = {
          top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
          left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
          bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
          right: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        };

        // Alternate row colors
        if (index % 2 === 0) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF5F5F5' },
          };
        } else {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFFFFF' },
          };
        }
      }

      currentRow++;
    });

    // ================= WHITE SEPARATOR ROW (FULLY BLANK) =================
    const whiteSeparatorRow = worksheet.getRow(currentRow);
    whiteSeparatorRow.height = 15;

    worksheet.mergeCells(`A${currentRow}:${lastCol}${currentRow}`);

    const whiteCell = whiteSeparatorRow.getCell(1);
    whiteCell.value = '';
    whiteCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFFFFF' },
    };
    whiteCell.border = {
      left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      right: { style: 'thin', color: { argb: 'FFCCCCCC' } },
    };

    currentRow++;

    // ================= SUMMARY SECTION (LIGHT BLUE BACKGROUND) =================
    // Total Teachers row
    const totalRow = worksheet.getRow(currentRow);
    totalRow.getCell(1).value = `Total Teachers: ${teachers.length}`;
    worksheet.mergeCells(`A${currentRow}:C${currentRow}`);
    totalRow.getCell(1).font = {
      bold: true,
      size: 11,
      color: { argb: 'FF1F4A7A' },
    };
    totalRow.getCell(1).alignment = { horizontal: 'left' };

    for (let i = 1; i <= 9; i++) {
      const cell = totalRow.getCell(i);
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE6F0FA' },
      };
      cell.border = {
        left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        right: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      };
    }

    currentRow++;

    // Generated date row
    const dateRow = worksheet.getRow(currentRow);

    const now = new Date();
    const month = now.getMonth() + 1;
    const day = now.getDate();
    const year = now.getFullYear();

    let hours = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;

    const formattedDate = `${month}/${day}/${year}`;
    const formattedTime = `${hours}:${minutes}:${seconds} ${ampm}`;

    dateRow.getCell(1).value = `Generated: ${formattedDate}, ${formattedTime}`;
    worksheet.mergeCells(`A${currentRow}:C${currentRow}`);
    dateRow.getCell(1).font = {
      italic: true,
      size: 10,
      color: { argb: 'FF666666' },
    };
    dateRow.getCell(1).alignment = { horizontal: 'left' };

    for (let i = 1; i <= 9; i++) {
      const cell = dateRow.getCell(i);
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE6F0FA' },
      };
      cell.border = {
        left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        right: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      };
    }

    // ================= FREEZE PANE =================
    worksheet.views = [
      {
        state: 'frozen',
        xSplit: 0,
        ySplit: tableStartRow,
        activeCell: 'A2',
      },
    ];

    // ================= RESPONSE HEADERS =================
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=teachers_report_${Date.now()}.xlsx`,
    );

    // ================= WRITE FILE =================
    await workbook.xlsx.write(res);
    res.end();
  }

  //teacher dashboard route goes as
  async getAssignedSubjects() {
    const teacher = await this.teacherRepo.findOne({ where: {} });
    if (!teacher) return new NotFoundException('Teacher does not exists.');
    return await this.subjectService.getAllSubjectList;
  }
}
