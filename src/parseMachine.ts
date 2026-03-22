import * as XState from 'xstate';
import * as XStateModel from 'xstate/lib/model';
import * as XStateActions from 'xstate/lib/actions';
import { StateNode } from 'xstate';
import realmsShim from 'realms-shim';

const realm = realmsShim.makeRootRealm();

const wrapCallbackToPreventThis =
  (callback: (...args: any[]) => void) =>
  (...args: any[]) => {
    return callback(...args);
  };

const windowShim = {
  setInterval: (callback: (...args: any[]) => void, ...args: any[]) => {
    return setInterval(wrapCallbackToPreventThis(callback), ...args);
  },
  setTimeout: (callback: (...args: any[]) => void, ...args: any[]) => {
    return setTimeout(wrapCallbackToPreventThis(callback), ...args);
  },
  clearTimeout: (...args: any[]) => {
    return clearTimeout(...args);
  },
  clearInterval: (...args: any[]) => {
    return clearInterval(...args);
  },
  confirm: (...args: any[]) => {
    return confirm(...args);
  },
  prompt: (...args: any[]) => {
    return prompt(...args);
  },
};

/**
 * Recursively transform xstate v5 config to v4:
 * - Rename `guard` to `cond` in transition objects
 */
function transformV5toV4(config: any): any {
  if (config == null || typeof config !== 'object') return config;
  if (Array.isArray(config)) return config.map(transformV5toV4);

  const result: any = {};
  for (const [key, value] of Object.entries(config)) {
    if (key === 'on' && value && typeof value === 'object') {
      const onResult: any = {};
      for (const [event, target] of Object.entries(value as any)) {
        if (Array.isArray(target)) {
          onResult[event] = target.map((t: any) => {
            if (t && typeof t === 'object' && 'guard' in t) {
              const { guard, ...rest } = t;
              return { ...transformV5toV4(rest), cond: guard };
            }
            return transformV5toV4(t);
          });
        } else if (target && typeof target === 'object' && 'guard' in (target as any)) {
          const { guard, ...rest } = target as any;
          onResult[event] = { ...transformV5toV4(rest), cond: guard };
        } else {
          onResult[event] = transformV5toV4(target);
        }
      }
      result[key] = onResult;
    } else if (key === 'states' && value && typeof value === 'object') {
      const statesResult: any = {};
      for (const [name, stateConfig] of Object.entries(value as any)) {
        statesResult[name] = transformV5toV4(stateConfig);
      }
      result[key] = statesResult;
    } else {
      result[key] = value;
    }
  }
  return result;
}

/**
 * xstate v5 `setup()` shim — accepts guard definitions and returns
 * an object with `createMachine` that transforms v5 config to v4.
 */
function makeSetup(createMachineFn: any) {
  return (_opts?: any) => ({
    createMachine: (...args: any[]) => {
      args[0] = transformV5toV4(args[0]);
      return createMachineFn(...args);
    },
  });
}

/** v5 guard combinators — return descriptive string names for display */
function guardAnd(guards: string[]): string { return guards.join('And'); }
function guardOr(guards: string[]): string { return guards.join('Or'); }
function guardNot(guard: string): string { return 'not' + guard; }

export function parseMachines(sourceJs: string): Array<StateNode> {
  const machines: Array<StateNode> = [];

  const createMachineCapturer =
    (machineFactory: any) =>
    (...args: any[]) => {
      args[0] = transformV5toV4(args[0]);
      const machine = machineFactory(...args);
      machines.push(machine);
      return machine;
    };

  realm.evaluate(sourceJs, {
    // we just allow for export statements to be used in the source code
    // we don't have any use for the exported values so we just mock the `exports` object
    exports: {},
    require: (sourcePath: string) => {
      switch (sourcePath) {
        case 'xstate':
          const wrappedCreateMachine = createMachineCapturer(XState.createMachine);
          return {
            ...XState,
            createMachine: wrappedCreateMachine,
            Machine: createMachineCapturer(XState.Machine),
            setup: makeSetup(wrappedCreateMachine),
            and: guardAnd,
            or: guardOr,
            not: guardNot,
          };
        case 'xstate/lib/actions':
          return XStateActions;
        case 'xstate/lib/model':
          const { createModel } = XStateModel;
          return {
            ...XStateModel,
            createModel(initialContext: any, creators: any) {
              const model = createModel(initialContext, creators);
              return {
                ...model,
                createMachine: createMachineCapturer(model.createMachine),
              };
            },
          };
        default:
          throw new Error(`External module ("${sourcePath}") can't be used.`);
      }
    },
    // users might want to access `console` in the sandboxed env
    console: {
      error: console.error,
      info: console.info,
      log: console.log,
      warn: console.warn,
    },
    window: globalThis,
    ...windowShim,
  });

  return machines;
}
