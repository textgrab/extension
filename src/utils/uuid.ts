// https://gist.github.com/jsmithdev/1f31f9f3912d40f6b60bdc7e8098ee9f
export function createUUID(): string {
    let dt = new Date().getTime();
  
    const uuid = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
      /[xy]/g,
      function (c) {
        const r = (dt + Math.random() * 16) % 16 | 0;
        dt = Math.floor(dt / 16);
        return (c == "x" ? r : (r & 0x3) | 0x8).toString(16);
      }
    );
  
    return uuid;
  }