import 'react';

declare module 'react' {
  export interface HTMLAttributes<T> extends AriaAttributes, DOMAttributes<T> {
    // Extend for custom attributes if needed
  }

  export interface FormEvent<T = Element> {
    preventDefault(): void;
    stopPropagation(): void;
    target: EventTarget & T;
    currentTarget: EventTarget & T;
    bubbles: boolean;
    cancelable: boolean;
    defaultPrevented: boolean;
    eventPhase: number;
    isTrusted: boolean;
    nativeEvent: Event;
    timeStamp: number;
    type: string;
  }

  export type FC<P = {}> = FunctionComponent<P>;

  export interface FunctionComponent<P = {}> {
    (props: P, context?: any): ReactElement<any, any> | null;
    propTypes?: WeakValidationMap<P> | undefined;
    contextTypes?: ValidationMap<any> | undefined;
    defaultProps?: Partial<P> | undefined;
    displayName?: string | undefined;
  }

  export type ReactNode = 
    | ReactElement<any, any> 
    | string 
    | number 
    | Iterable<ReactNode> 
    | ReactPortal 
    | boolean 
    | null 
    | undefined;

  export interface ReactElement<P = any, T extends string | JSXElementConstructor<any> = string | JSXElementConstructor<any>> {
    type: T;
    props: P;
    key: Key | null;
  }

  export type JSXElementConstructor<P> =
    | ((props: P) => ReactElement<any, any> | null)
    | (new (props: P) => Component<any, any>);

  export type Key = string | number;

  export interface ReactPortal {
    key: Key | null;
    children: ReactNode;
  }

  export interface WeakValidationMap<T> {
    [key: string]: WeakValidator<T>;
  }

  export interface ValidationMap<T> {
    [key: string]: Validator<T>;
  }

  export type Validator<T> = (object: T, key: string, componentName: string, ...rest: any[]) => Error | null;
  export type WeakValidator<T> = (object: {[key: string]: T}, key: string, componentName: string, ...rest: any[]) => Error | null;
} 