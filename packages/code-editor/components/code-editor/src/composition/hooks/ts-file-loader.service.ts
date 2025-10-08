export class TsFileLoaderService {

  public load(files: string[]): Promise<{ name: string, content: string }[]> {

    const contents = files.map((name) => {
      return { name, content: "" };
    }).filter(item => item);

    return new Promise((success) => {
      success(contents);
    });
  }

}
