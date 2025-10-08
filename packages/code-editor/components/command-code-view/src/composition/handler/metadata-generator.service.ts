

import { Observable, of, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { WebComponentMetadata } from '../class/web-component';
import { FileService } from '../class/file.service';
import { MetadataDto } from '../../type/metadata-generator';
import { MetadataService } from '../class/metadata.service';

/**
 * 负责新建元数据
 * @remarks
 * 当只有命令构件时补加Web构件，当只有Web构件时补加命令构件，当Web构件缺失ts文件时补加ts文件
 */
export class MetadataGenerator {
  private fileService: FileService;
  private metadataService: MetadataService;
  constructor() {
    this.fileService = new FileService();
    this.metadataService = new MetadataService();
  }

  /**
   * 补加Web构件
   * @param webcmdDto - 原有的命令构件传输对象
   * @param fileNameWithoutSuffix - 共同的文件名称
   * @returns 错误信息
   */
  public addWebcmp(webcmdDto: MetadataDto, fileNameWithoutSuffix: string): Observable<string> {
    // 获取扩展字段
    const parsedExtendProperty = JSON.parse(webcmdDto.extendProperty);
    const extendProperty = {} as any;
    if (parsedExtendProperty) {
      extendProperty.IsCommon = parsedExtendProperty.IsCommon || false;
      extendProperty.FormCode = parsedExtendProperty.FormCode || null;
    }
    // 新建元数据传输对象，用于创建元数据
    const newDto = new MetadataDto(
      '',
      webcmdDto.nameSpace,
      webcmdDto.code,
      webcmdDto.code,  // 初始时使用编号作为名称，因为name是另一个构件的中文名，直接复制不恰当
      fileNameWithoutSuffix + '.webcmp',
      'WebComponent',
      webcmdDto.bizobjectID,
      webcmdDto.relativePath,
      JSON.stringify(extendProperty),
      '',
      webcmdDto.extendable
    );

    return of(null).pipe(
      switchMap(() => {  // 判断是否已存在同名webcmp元数据
        return this.fileService.isFileExist(newDto.relativePath, newDto.fileName);
      }),
      switchMap((isRepeat: boolean) => {  // 初始化webcmp元数据实例
        if (isRepeat) {
          return throwError(`已经存在文件名为${newDto.fileName}的元数据`);
        }
        return this.metadataService.initializeMetadataEntity(newDto);
      }),
      switchMap((data: any) => {  // 创建webcmp元数据
        // 按照预定的名称重新设置ts源文件的路径
        data.fileName = newDto.fileName;
        const sourcePath = newDto.relativePath + '/' + fileNameWithoutSuffix + '.ts';
        const newWebcmp = new WebComponentMetadata();
        newWebcmp.input(JSON.parse(data.content));
        newWebcmp.Source = sourcePath;
        data.content = JSON.stringify(newWebcmp.output());
        return this.metadataService.createMetadata(data);
      }),
      switchMap((result: any) => {  // 判断对应名称的ts文件是否已经存在，如果已存在则不再进行创建
        if (result.statusText !== 'OK') {
          return throwError("元数据创建失败，请重新尝试");
        }
        return this.fileService.isFileExist(newDto.relativePath, fileNameWithoutSuffix + '.ts');
      }),
      switchMap((tsFileExist: boolean) => {  // 新建对应的ts文件
        if (tsFileExist) {
          return of(true);
        }
        const sourcePath = newDto.relativePath + '/' + fileNameWithoutSuffix + '.ts';
        return this.fileService.createTsFile('', sourcePath);
      }),
      switchMap((isCreateTsFileSuccess: boolean) => {
        if (isCreateTsFileSuccess) {
          return of('');
        }
        return of("创建ts文件失败");
      }),
      catchError((error: string) => {
        return of(error);
      })
    );
  }

  /**
   * 补加命令构件
   * @param webcmpDto - 原有的Web构件传输对象
   * @param fileNameWithoutSuffix - 共同的文件名称
   * @returns 错误信息
   */
  public addWebcmd(webcmpDto: MetadataDto, fileNameWithoutSuffix: string): Observable<string> {
    // 获取扩展字段，因为Web构件的扩展字段中包含ts代码所以不能直接使用
    const parsedExtendProperty = JSON.parse(webcmpDto.extendProperty);
    const extendProperty = {} as any;
    if (parsedExtendProperty) {
      extendProperty.IsCommon = parsedExtendProperty.IsCommon || false;
      extendProperty.FormCode = parsedExtendProperty.FormCode || null;
    }
    // 新建元数据传输对象，用于创建元数据
    const newDto = new MetadataDto(
      '',
      webcmpDto.nameSpace,
      webcmpDto.code,
      webcmpDto.code,  // 初始时使用编号作为名称
      fileNameWithoutSuffix + '.webcmd',
      'WebCommand',
      webcmpDto.bizobjectID,
      webcmpDto.relativePath,
      JSON.stringify(extendProperty),
      '',
      webcmpDto.extendable
    );
    // 先判断webcmd文件是否已经存在
    return of(null).pipe(
      switchMap(() => {
        return this.fileService.isFileExist(newDto.relativePath, newDto.fileName);
      }),
      switchMap((isRepeat: boolean) => {
        if (isRepeat) {
          return throwError(`已经存在文件名为${newDto.fileName}的元数据`);
        }
        return this.metadataService.initializeMetadataEntity(newDto);
      }),
      switchMap((data: any) => {
        data.fileName = newDto.fileName;
        return this.metadataService.createMetadata(data);
      }),
      switchMap((result: any) => {
        if (result.statusText !== 'OK') {
          return of("元数据创建失败，请重新尝试");
        }
        return of('');
      }),
      catchError((error: string) => {
        return of(error);
      })
    );
  }

}
