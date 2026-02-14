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

    // Fetch students with filters
    const query = this.studentRepo
      .createQueryBuilder('student')
      .innerJoinAndSelect('student.program', 'program');

    const filteredQuery = this.applyFilters(query, filters);
    filteredQuery.andWhere('student.deletedAt IS NULL');
    filteredQuery.orderBy('student.firstName', 'ASC');

    const students = await filteredQuery.getMany();

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

    // Define columns
    worksheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Full Name', key: 'name', width: 25 },
      { header: 'Gender', key: 'gender', width: 10 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Phone', key: 'phone', width: 15 },
      { header: 'Roll No', key: 'rollNumber', width: 15 },
      { header: 'Reg No', key: 'registrationNumber', width: 18 },
      { header: 'Semester', key: 'semester', width: 10 },
      { header: 'Address', key: 'address', width: 30 },
      { header: 'Program', key: 'program', width: 20 },
      { header: 'Status', key: 'status', width: 12 },
    ];

    const lastCol = 'K'; // 11 columns (A to K)
    let currentRow = 1;

    // ================= HEADER SECTION WITH LOGO =================
    // Use 8 rows for header (logo at top, text at bottom)
    const headerRows = 8;
    worksheet.mergeCells(
      `A${currentRow}:${lastCol}${currentRow + headerRows - 1}`,
    );
    const headerCell = worksheet.getCell(`A${currentRow}`);

    // Style the header background
    headerCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1A4B7A' }, // Deep blue background
    };

    headerCell.border = {
      top: { style: 'medium', color: { argb: 'FF0A192F' } },
      left: { style: 'medium', color: { argb: 'FF0A192F' } },
      bottom: { style: 'medium', color: { argb: 'FF0A192F' } },
      right: { style: 'medium', color: { argb: 'FF0A192F' } },
    };

    // Add logo from file - FIXED: Better positioning for circular logo
    const logoPath = join(process.cwd(), 'src', 'assets', 'lms-logo.png');
    const fs = require('fs');

    if (fs.existsSync(logoPath)) {
      const logoImageId = workbook.addImage({
        filename: logoPath,
        extension: 'png',
      });

      // FIXED: Position logo exactly as in the image - top center with proper sizing
      // Using row 0.5 to place it at the top with some padding
      // Using 100x100 to maintain aspect ratio and make it appear round
      worksheet.addImage(logoImageId, {
        tl: { col: 5.2, row: 0.8 }, // Centered horizontally, slightly adjusted
        ext: { width: 100, height: 100 }, // Square dimensions for circular logo
        editAs: 'oneCell',
      });
    }

    // Build header text exactly as shown in the image
    let headerText = 'RESULT PROCESSING SYSTEM - LMS';
    if (programId && students.length > 0 && students[0].program) {
      headerText += `\n${students[0].program.name}`;
    }
    if (currentSemester) {
      headerText += `\nSemester ${currentSemester}`; // FIXED: Format as "Semester X" to match image
    }

    // Use statusLabels for status text
    const statusText =
      status && statusLabels[status] ? statusLabels[status] : '';
    headerText += `\n${statusText} Student Report`; // FIXED: Removed extra space

    headerCell.value = headerText;
    headerCell.font = {
      name: 'Calibri',
      size: 20,
      bold: true,
      color: { argb: 'FFFFFFFF' }, // White text
    };
    headerCell.alignment = {
      horizontal: 'center',
      vertical: 'bottom', // Align text to bottom of merged cell
      wrapText: true,
    };

    // Move past header
    currentRow += headerRows;

    // ================= ADD SPACE GAP (3 blank rows) =================
    // This creates the gap between header text and table header - EXACTLY as in image
    for (let i = 0; i < 3; i++) {
      const blankRow = worksheet.getRow(currentRow);
      blankRow.height = 20;
      currentRow++;
    }

    // ================= TABLE HEADER =================
    const headerRow = worksheet.getRow(currentRow);
    headerRow.values = worksheet.columns.map((col) => col.header as string);
    headerRow.height = 30;

    headerRow.eachCell((cell) => {
      cell.font = {
        bold: true,
        size: 12,
        color: { argb: 'FFFFFFFF' },
        name: 'Calibri',
      };
      cell.alignment = {
        horizontal: 'center',
        vertical: 'middle',
        wrapText: true,
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

    const tableStartRow = currentRow;
    currentRow++;

    // ================= DATA ROWS =================
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
        row.getCell(2).value =
          `${student.firstName || ''} ${student.lastName || ''}`.trim();
        row.getCell(3).value = student.gender || 'N/A';
        row.getCell(4).value = student.email || 'N/A';
        row.getCell(5).value = student.phone || 'N/A';
        row.getCell(6).value = student.rollNumber || 'N/A';
        row.getCell(7).value = student.registrationNumber || 'N/A';
        row.getCell(8).value = student.currentSemester?.toString() || 'N/A';

        // FIXED: Format address to match the image style (Country, City format)
        const address = [student.address2, student.address1]
          .filter((addr) => addr && addr.trim() !== '')
          .join(', ');
        row.getCell(9).value = address || 'N/A';

        row.getCell(10).value = student.program?.name || 'N/A';

        // Use statusLabels for status display in data rows
        const statusDisplay =
          student.status && statusLabels[student.status]
            ? statusLabels[student.status]
            : student.status || 'N/A';
        row.getCell(11).value = statusDisplay;

        row.height = 22;

        for (let i = 1; i <= 11; i++) {
          const cell = row.getCell(i);

          if (i === 1 || i === 3 || i === 8) {
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

          if (index % 2 === 0) {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFF8F9FA' },
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
    }

    // ================= SUMMARY ROW =================
    const summaryRow = worksheet.getRow(currentRow);
    summaryRow.getCell(1).value = `Total Students: ${students.length}`;
    worksheet.mergeCells(`A${currentRow}:C${currentRow}`);
    summaryRow.getCell(1).font = {
      bold: true,
      size: 11,
      color: { argb: 'FF1A4B7A' },
    };
    summaryRow.getCell(1).alignment = { horizontal: 'left' };

    // FIXED: Format date exactly as in image (MM/DD/YYYY, HH:MM:SS AM/PM)
    const now = new Date();
    const formattedDate = now.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
    });
    const formattedTime = now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });

    const dateCell = summaryRow.getCell(11);
    dateCell.value = `Generated: ${formattedDate}, ${formattedTime}`;
    dateCell.font = { italic: true, size: 10, color: { argb: 'FF666666' } };
    dateCell.alignment = { horizontal: 'right' };

    for (let i = 1; i <= 11; i++) {
      const cell = summaryRow.getCell(i);
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF0F7FF' },
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

    // ================= AUTO FILTER =================
    worksheet.autoFilter = {
      from: { row: tableStartRow, column: 1 },
      to: { row: tableStartRow, column: 11 },
    };

    // ================= RESPONSE HEADERS =================
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=students_report_${Date.now()}.xlsx`,
    );

    // ================= WRITE FILE =================
    await workbook.xlsx.write(res);
    res.end();
  }
}
