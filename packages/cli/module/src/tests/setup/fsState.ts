export const writeCalls: Array<{ path: string; content: string }> = [];
export const unlinkCalls: string[] = [];
export const rmCalls: Array<{ path: string; opts?: unknown }> = [];
export const copyCalls: Array<{ src: string; dest: string }> = [];
export const cpCalls: Array<{ src: string; dest: string; opts?: unknown }> = [];
export const appendCalls: Array<{ path: string; content: string }> = [];
