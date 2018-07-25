// TODO: This service is supposed to delay the execution of a test process file.
// As soon as the process engine supports intermediate timer events, this service
// can be replaced by timer events within the process itself.
export class ProcessDelayer {

  public async wait(timeInMs: number): Promise<void> {
    await new Promise((resolve: Function): void => {
      setTimeout(() => {
        resolve();
      }, timeInMs);
    });
  }
}
