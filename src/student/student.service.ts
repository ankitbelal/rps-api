import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CreateStudentDto,
  SearchStudentListDto,
  StudentQueryDto,
} from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Student } from 'src/database/entities/student.entity';
import { Brackets, Repository } from 'typeorm';
import { UserService } from 'src/user/user.service';
import {
  statusLabels,
  StudentStatus,
  UserStatus,
  UserType,
} from 'utils/enums/general-enums';
import { SelectQueryBuilder } from 'typeorm';
import { UserSync } from 'src/user/interfaces/user-interface';
import { User } from 'src/database/entities/user.entity';
import { mapStudentUserStatus } from 'utils/general-utils';
import * as ExcelJS from 'exceljs';
import type { Response } from 'express';
import { join } from 'path';

@Injectable()
export class StudentService {
  constructor(
    @InjectRepository(Student)
    private readonly studentRepo: Repository<Student>,
    private readonly userService: UserService,
  ) {}

  async create(createStudentDto: CreateStudentDto): Promise<Boolean> {
    const {
      emailUsed,
      phoneUsed,
      rollNumberExists,
      registrationNumberExists,
      valid,
    } = await this.validateStudentContact(createStudentDto);

    if (!valid) {
      const errors: any = {};
      if (emailUsed) errors.email = 'Already used.';
      if (phoneUsed) errors.phone = 'Alread used.';
      if (rollNumberExists) errors.rollNumber = 'Already exists.';
      if (registrationNumberExists)
        errors.registrationNumber = 'Already exists.';

      throw new ConflictException({
        success: false,
        statusCode: 409,
        message: 'Validation failed',
        errors,
      });
    }

    const studentData: Partial<Student> = { ...createStudentDto };

    if (createStudentDto.createUser) {
      studentData.userId = (await this.createUser(createStudentDto)).id;
    }

    return !!(await this.studentRepo.save(
      this.studentRepo.create(studentData),
    ));
  }

  async findAll(studentQueryDto: StudentQueryDto): Promise<{
    data: Student[];
    total?: number;
    page?: number;
    lastPage?: number;
    limit?: number;
  }> {
    const { page = 1, limit = 10, ...filters } = studentQueryDto;
    const query = this.studentRepo
      .createQueryBuilder('student')
      .innerJoin('student.program', 'program');

    if (filters?.id) {
      query.andWhere('student.id = :id', { id: filters.id });

      query.select(Student.ALLOWED_DETAILS);
      const data = await query.getOne();
      if (!data)
        throw new NotFoundException({
          statusCode: 404,
          message: `Student with id: ${filters.id} does not exists`,
        });
      return { data: [data] };
    }

    const filteredquery = this.applyFilters(query, filters);
    filteredquery.andWhere('student.deletedAt IS NULL');
    filteredquery.select(Student.ALLOWED_FIELDS_LIST);
    filteredquery.skip((page - 1) * limit).take(limit);
    filteredquery.orderBy('student.firstName', 'ASC');
    const [data, total] = await filteredquery.getManyAndCount();
    const lastPage = Math.ceil(total / limit);
    return { data, total, page, lastPage, limit };
  }

  private applyFilters(
    query: SelectQueryBuilder<Student>,
    filters: Partial<StudentQueryDto>,
  ): SelectQueryBuilder<Student> {
    if (filters?.status) {
      query.andWhere('student.status = :status', {
        status: filters.status,
      });
    }

    if (filters?.programId) {
      query.andWhere('student.program_id = :programId', {
        programId: filters.programId,
      });
    }

    if (filters?.currentSemester) {
      query.andWhere('student.current_semester = :currentSemester', {
        currentSemester: filters.currentSemester,
      });
    }

    if (filters?.search) {
      query.andWhere(
        new Brackets((qb) => {
          qb.where('student.first_name LIKE :search', {
            search: `%${filters.search}%`,
          })
            .orWhere('student.last_name LIKE :search', {
              search: `%${filters.search}%`,
            })
            .orWhere('student.email LIKE :search', {
              search: `%${filters.search}%`,
            })
            .orWhere('student.phone LIKE :search', {
              search: `%${filters.search}%`,
            });
        }),
      );
    }

    return query;
  }

  async update(
    id: number,
    updateStudentDto: UpdateStudentDto,
  ): Promise<Boolean> {
    const student = await this.findStudentById(id);
    if (!student) {
      throw new NotFoundException({
        status: 'false',
        statusCode: 404,
        message: `Student with id: ${id} does not exists.`,
      });
    }

    const isEmailChanged =
      updateStudentDto.email && updateStudentDto.email !== student.email;

    const isPhoneChanged =
      updateStudentDto.phone && updateStudentDto.phone !== student.phone;

    if (isEmailChanged || isPhoneChanged) {
      const { emailUsed, phoneUsed, valid } =
        await this.validateStudentContact(updateStudentDto);

      if (!valid) {
        const errors: any = {};
        if (emailUsed && updateStudentDto.email !== student.email)
          errors.email = 'Already used';
        if (phoneUsed && updateStudentDto.phone !== student.phone)
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
    if (student.userId) await this.syncWithUser(updateStudentDto, student);
    Object.assign(student, updateStudentDto);
    await this.studentRepo.save(student);
    return true;
  }

  async remove(id: number): Promise<Boolean> {
    const student = await this.findStudentById(id);
    if (!student)
      throw new NotFoundException({
        status: 'false',
        statusCode: 404,
        message: `Student with id: ${id} does not exists.`,
      });

    if (student.userId) {
      await this.userService.removeUser(student.userId);
    }
    return !!(await this.studentRepo.softRemove(student));
  }

  async findStudentById(id: number): Promise<Student | null> {
    return await this.studentRepo.findOne({ where: { id } });
  }

  async validateStudentContact(data: {
    email?: string;
    phone?: string;
    rollNumber?: string;
    registrationNumber?: string;
  }): Promise<{
    emailUsed: boolean;
    phoneUsed: boolean;
    rollNumberExists: boolean;
    registrationNumberExists: boolean;
    valid: boolean;
  }> {
    let emailUsed = false;
    let phoneUsed = false;
    let rollNumberExists = false;
    let registrationNumberExists = false;

    if (data.email) {
      const email = await this.studentRepo.findOne({
        where: { email: data.email },
      });
      emailUsed = !!email;
    }

    if (data.phone) {
      const phone = await this.studentRepo.findOne({
        where: { phone: data.phone },
      });
      phoneUsed = !!phone;
    }

    if (data.rollNumber) {
      const rollNumber = await this.studentRepo.findOne({
        where: { rollNumber: data.rollNumber },
      });

      rollNumberExists = !!rollNumber;
    }

    if (data.registrationNumber) {
      const registrationNumber = await this.studentRepo.findOne({
        where: { registrationNumber: data.registrationNumber },
      });
      registrationNumberExists = !!registrationNumber;
    }
    const valid =
      !emailUsed &&
      !phoneUsed &&
      !registrationNumberExists &&
      !rollNumberExists;
    return {
      emailUsed,
      phoneUsed,
      rollNumberExists,
      registrationNumberExists,
      valid,
    };
  }

  async getAllStudentList(
    searchStudentListDto: SearchStudentListDto,
  ): Promise<{ studentList: Student[] }> {
    const query = this.studentRepo
      .createQueryBuilder('student')
      .select('student.id', 'id')
      .addSelect("CONCAT(student.first_name, ' ', student.last_name)", 'name');

    if (searchStudentListDto.name) {
      const parts = searchStudentListDto.name.trim().split(/\s+/);
      if (parts.length === 1) {
        query.andWhere(
          '(student.first_name LIKE :name OR student.last_name LIKE :name)',
          { name: `%${parts[0]}%` },
        );
      } else {
        query.andWhere(
          '(student.first_name LIKE :first and student.last_name LIKE :last)',
          {
            first: `%${parts[0]}$`,
            last: `%${parts[1]}%`,
          },
        );
      }
    }

    const studentList = await query.getRawMany();
    return { studentList };
  }

  async getStudentsDashboardData() {
    const [active, passed] = await Promise.all([
      this.studentRepo.count({ where: { status: StudentStatus.ACTIVE } }),
      this.studentRepo.count({ where: { status: StudentStatus.PASSED } }),
    ]);

    return {
      active,
      passed,
      total: active + passed,
    };
  }

  async getStudentDistributionByProgram(): Promise<Record<string, number>> {
    const result = await this.studentRepo
      .createQueryBuilder('student')
      .leftJoin('student.program', 'program')
      .select('program.code', 'programCode')
      .addSelect('COUNT(student.id)', 'count')
      .groupBy('program.id')
      .getRawMany();

    const studentsDistributions: Record<string, number> = {};
    result.forEach(
      (r) => (studentsDistributions[r.programCode] = Number(r.count)),
    );

    return studentsDistributions;
  }

  async syncWithUser(
    dto: UpdateStudentDto,
    student?: Student | null,
  ): Promise<boolean> {
    const userSync: UserSync = {};
    userSync.id = student?.userId;

    if (
      (dto.firstName || dto.lastName) &&
      (dto.firstName !== student?.firstName ||
        dto.lastName !== student?.lastName)
    ) {
      userSync.name = dto.firstName + ' ' + dto.lastName;
    }

    if (dto.email && dto.email !== student?.email) {
      userSync.email = dto.email;
    }
    if (dto.status && dto.status !== student?.status) {
      userSync.status = await mapStudentUserStatus(dto.status);
    }

    if (Object.keys(userSync).length > 1)
      return !!(await this.userService.createUser(userSync));
    return true;
  }

  async createUser(dto: CreateStudentDto): Promise<User> {
    const userSync: UserSync = {
      name: dto.firstName + ' ' + dto.lastName,
      email: dto.email,
      userType: UserType.STUDENT,
      status: UserStatus.ACTIVE,
    };
    return await this.userService.createUser(userSync);
  }

  async generateExcelReport(
    studentQueryDto: StudentQueryDto,
    res: Response,
  ): Promise<void> {
    const { programId, currentSemester, status, ...filters } = studentQueryDto;

    const query = this.studentRepo
      .createQueryBuilder('student')
      .innerJoinAndSelect('student.program', 'program');

    const filteredQuery = this.applyFilters(query, filters);
    filteredQuery.andWhere('student.deletedAt IS NULL');
    filteredQuery.orderBy('student.firstName', 'ASC');

    const students = await filteredQuery.getMany();

    if (!students.length) {
      throw new NotFoundException('No data found to export.');
    }

    let programName = '';
    if (programId && students.length > 0 && students[0].program) {
      programName = students[0].program.name;
    }

    // Create workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'LMS System';
    workbook.lastModifiedBy = 'LMS System';
    workbook.created = new Date();
    workbook.modified = new Date();

    const worksheet = workbook.addWorksheet('Students Report', {
      properties: { tabColor: { argb: 'FF244062' } },
      pageSetup: { paperSize: 9, orientation: 'landscape' },
    });

    // Define columns - EXACT widths as in image
    worksheet.columns = [
      { header: 'ID', key: 'id', width: 8 },
      { header: 'Full Name', key: 'name', width: 22 },
      { header: 'Gender', key: 'gender', width: 8 },
      { header: 'Email', key: 'email', width: 28 },
      { header: 'Phone', key: 'phone', width: 15 },
      { header: 'Roll No', key: 'rollNumber', width: 14 },
      { header: 'Reg No', key: 'registrationNumber', width: 18 },
      { header: 'Semester', key: 'semester', width: 9 },
      { header: 'Address', key: 'address', width: 25 },
      { header: 'Program', key: 'program', width: 22 },
      { header: 'Status', key: 'status', width: 12 },
    ];

    const lastCol = 'K';
    let currentRow = 1;

    //HEADER SECTION WITH LOGO
    // Use 12 rows for header to give MORE space between logo and text
    const headerRows = 12;
    worksheet.mergeCells(
      `A${currentRow}:${lastCol}${currentRow + headerRows - 1}`,
    );
    const headerCell = worksheet.getCell(`A${currentRow}`);

    // Style the header background - LIGHT YELLOW as in image (#4)
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

      // Position logo at top center - with equal width/height for perfect circle
      worksheet.addImage(logoImageId, {
        tl: { col: 5.1, row: 0.8 }, // Top center position
        ext: { width: 100, height: 100 }, // Equal width/height = perfect circle
        editAs: 'oneCell',
      });
    }

    //DYNAMIC HEADER TEXT WITH COLORS

    // Create rich text array with proper typing
    const richText: ExcelJS.RichText[] = [];

    // Add line breaks for logo spacing (5 line breaks)
    richText.push({
      font: {
        name: 'Calibri',
        size: 20,
        bold: true,
        color: { argb: 'FF008080' }, // Dark teal (will be overridden by next line)
      },
      text: '\n\n\n\n\n',
    });

    // First line - Dark teal (#2)
    richText.push({
      font: {
        name: 'Calibri',
        size: 20,
        bold: true,
        color: { argb: 'FF008080' }, // Dark teal
      },
      text: 'RESULT PROCESSING SYSTEM - LMS\n',
    });

    // Second line: Program name with optional semester - Dark blue (#1)
    if (programName) {
      let secondLineText = programName;
      if (currentSemester) {
        secondLineText += ` - ${currentSemester}th Semester`;
      }

      richText.push({
        font: {
          name: 'Calibri',
          size: 18,
          bold: true,
          color: { argb: 'FF00008B' }, // Dark blue
        },
        text: secondLineText + '\n',
      });
    }

    // Third line: Status + Student Report - Dark red (#3)
    let thirdLineText = '';
    if (status && statusLabels[status]) {
      thirdLineText = `${statusLabels[status]} `;
    }
    thirdLineText += 'Student Report';

    richText.push({
      font: {
        name: 'Calibri',
        size: 18,
        bold: true,
        color: { argb: 'FF8B0000' }, // Dark red
      },
      text: thirdLineText,
    });

    // Set the header cell value as rich text
    headerCell.value = { richText };

    headerCell.alignment = {
      horizontal: 'center',
      vertical: 'bottom',
      wrapText: true,
    };

    // Move past header
    currentRow += headerRows;

    // TWO BLANK WHITE ROWS (MERGED) BEFORE TABLE
    // First blank white row - merged A to K
    const firstBlankRow = worksheet.getRow(currentRow);
    worksheet.mergeCells(`A${currentRow}:${lastCol}${currentRow}`);
    firstBlankRow.getCell(1).value = '';
    firstBlankRow.height = 15;

    // Apply white background
    for (let i = 1; i <= 11; i++) {
      const cell = firstBlankRow.getCell(i);
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFFFFF' }, // Pure white
      };
      cell.border = {
        left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        right: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      };
    }
    currentRow++;

    // Second blank white row - merged A to K
    const secondBlankRow = worksheet.getRow(currentRow);
    worksheet.mergeCells(`A${currentRow}:${lastCol}${currentRow}`);
    secondBlankRow.getCell(1).value = '';
    secondBlankRow.height = 15;

    // Apply white background
    for (let i = 1; i <= 11; i++) {
      const cell = secondBlankRow.getCell(i);
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFFFFF' }, // Pure white
      };
      cell.border = {
        left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        right: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      };
    }
    currentRow++;

    //TABLE HEADER WITH AUTO FILTER
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
        fgColor: { argb: 'FF244062' }, // Dark blue header
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } },
      };
    });

    // Apply auto filter to the header row - this adds the filter dropdown buttons
    worksheet.autoFilter = {
      from: { row: currentRow, column: 1 },
      to: { row: currentRow, column: 11 },
    };

    const tableStartRow = currentRow;
    currentRow++;

    //DATA ROWS
    if (students.length === 0) {
      const noDataRow = worksheet.getRow(currentRow);
      noDataRow.getCell(1).value = 'No students found matching the criteria';
      worksheet.mergeCells(`A${currentRow}:${lastCol}${currentRow}`);
      noDataRow.getCell(1).alignment = {
        horizontal: 'center',
        vertical: 'middle',
      };
      noDataRow.getCell(1).font = { italic: true, color: { argb: 'FFFF0000' } };
      currentRow++;
    } else {
      students.forEach((student, index) => {
        const row = worksheet.getRow(currentRow);

        row.getCell(1).value = student.id;

        // Format full name as in image
        const fullName =
          `${student.firstName || ''} ${student.lastName || ''}`.trim();
        row.getCell(2).value = fullName;

        row.getCell(3).value = student.gender || '';
        row.getCell(4).value = student.email || '';
        row.getCell(5).value = student.phone || '';
        row.getCell(6).value = student.rollNumber || '';
        row.getCell(7).value = student.registrationNumber || '';
        row.getCell(8).value = student.currentSemester?.toString() || '';

        // Format address exactly as in image (Country, City)
        const address = [student.address1, student.address2]
          .filter((addr) => addr && addr.trim() !== '')
          .join(', ');
        row.getCell(9).value = address || '';

        // Format program name as in image
        row.getCell(10).value = student.program?.name || '';

        // Use statusLabels for status display in data rows
        const statusDisplay =
          student.status && statusLabels[student.status]
            ? statusLabels[student.status]
            : student.status || 'N/A';
        row.getCell(11).value = statusDisplay;

        row.height = 20;

        for (let i = 1; i <= 11; i++) {
          const cell = row.getCell(i);

          // Center alignment for specific columns
          if (i === 1 || i === 3 || i === 8 || i === 11) {
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

          // Alternate row colors - exactly as in image
          if (index % 2 === 0) {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFF5F5F5' }, // Light gray for even rows
            };
          } else {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFFFFFFF' }, // White for odd rows
            };
          }
        }

        currentRow++;
      });
    }

    //WHITE SEPARATOR ROW (FULLY BLANK)
    // This creates a visual separation between data and summary
    const whiteSeparatorRow = worksheet.getRow(currentRow);
    whiteSeparatorRow.height = 15;

    // Merge the entire row from A to K as a single cell
    worksheet.mergeCells(`A${currentRow}:${lastCol}${currentRow}`);

    // Make it completely blank with white background
    const whiteCell = whiteSeparatorRow.getCell(1);
    whiteCell.value = '';
    whiteCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFFFFF' }, // Pure white background
    };
    whiteCell.border = {
      left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      right: { style: 'thin', color: { argb: 'FFCCCCCC' } },
    };

    currentRow++;

    //SUMMARY SECTION (LIGHT BLUE BACKGROUND)
    const summaryStartRow = currentRow;

    // Total Students row - LEFT ALIGNED
    const totalRow = worksheet.getRow(currentRow);
    totalRow.getCell(1).value = `Total Students: ${students.length}`;
    worksheet.mergeCells(`A${currentRow}:C${currentRow}`);
    totalRow.getCell(1).font = {
      bold: true,
      size: 11,
      color: { argb: 'FF1F4A7A' }, // Dark blue
    };
    totalRow.getCell(1).alignment = { horizontal: 'left' };

    // Apply light blue background to entire row
    for (let i = 1; i <= 11; i++) {
      const cell = totalRow.getCell(i);
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE6F0FA' }, // Very light blue
      };
      cell.border = {
        left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        right: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      };
    }

    currentRow++;

    // Generated date row - LEFT ALIGNED (right below total students)
    const dateRow = worksheet.getRow(currentRow);

    // Format date exactly as in image (M/D/YYYY, HH:MM:SS AM/PM)
    const now = new Date();
    const month = now.getMonth() + 1;
    const day = now.getDate();
    const year = now.getFullYear();

    let hours = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // 12-hour format

    const formattedDate = `${month}/${day}/${year}`;
    const formattedTime = `${hours}:${minutes}:${seconds} ${ampm}`;

    // LEFT ALIGN the generated date in column A (merged A-C)
    dateRow.getCell(1).value = `Generated: ${formattedDate}, ${formattedTime}`;
    worksheet.mergeCells(`A${currentRow}:C${currentRow}`);
    dateRow.getCell(1).font = {
      italic: true,
      size: 10,
      color: { argb: 'FF666666' },
    };
    dateRow.getCell(1).alignment = { horizontal: 'left' };

    // Apply light blue background to entire date row
    for (let i = 1; i <= 11; i++) {
      const cell = dateRow.getCell(i);
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE6F0FA' }, // Very light blue
      };
      cell.border = {
        left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        right: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      };
    }

    //FREEZE PANE
    worksheet.views = [
      {
        state: 'frozen',
        xSplit: 0,
        ySplit: tableStartRow,
        activeCell: 'A2',
      },
    ];

    //RESPONSE HEADERS
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=students_report_${Date.now()}.xlsx`,
    );

    //WRITE FILE
    await workbook.xlsx.write(res);
    res.end();
  }
}
