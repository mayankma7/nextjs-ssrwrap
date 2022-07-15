import {
  GetServerSideProps,
  GetServerSidePropsContext,
  GetServerSidePropsResult,
  Redirect,
} from 'next';
import { FC } from 'react';

// Specifies the shape of props in normally rendered component
interface IBaseComponent {
  text: string;
}

// The normally rendered component
const BaseComponent: FC<IBaseComponent> = ({ text }) => {
  return <div>{text}</div>;
};

// Specifies the shape of props in case of SSR error
interface IErrorComponent {
  message?: string;
  status?: number;
}

// The component rendered on SSR error
const ErrorComponent: FC<IErrorComponent> = (props) => {
  return <>{props.message}</>;
};

// Fallback error component (global default)
const DefaultErrorComponent: FC = () => {
  return <div>Default Error Component</div>;
};

// Shape of consolidated props, including normal props and error props
type PropsWithSSR<P = {}, E = {}> = { error: E } | { props: P };

// Higher order functional component which discriminates between normal and error props, and renders the respective component
const getWrappedComponent = <P, E>(
  baseComponent: FC<P>,
  errorComponent?: FC<E>
) => {
  return (propsFromSSR: PropsWithSSR<P, E>) => {
    // JSX syntax can be used here instead of function calls, pick your poison

    if ('error' in propsFromSSR) {
      return errorComponent
        ? errorComponent(propsFromSSR.error)
        : DefaultErrorComponent({});
    }

    if ('props' in propsFromSSR) return baseComponent(propsFromSSR.props);

    return null;
  };
};

// Extending the native GetServerSidePropsResult interface to include property 'error'
type GetServerSidePropsHandler<P, E> = (
  context: GetServerSidePropsContext
) => Promise<GetServerSidePropsResult<P> | { error: E }>;

// The above type definition expands to this
// type GetServerSidePropsHandler<P, E> = (context: GetServerSidePropsContext) => Promise<
//     | { error: E }
//     | { props: P | Promise<P> }
//     | { redirect: Redirect }
//     | { notFound: true }>;

function withAuthSSR<P, E>(handler: GetServerSidePropsHandler<P, E>) {
  const wrappedHandler: GetServerSideProps<PropsWithSSR<P, E>> = async (
    context
  ) => {
    // Use the context object to access data from incoming HTTP request, like cookies, and perform authentication

    const isAuthenticated = true; // Change this value to simulate authentication logic results

    if (!isAuthenticated) {
      return {
        redirect: {
          destination: '/',
          permanent: false,
        },
      };
    }

    const handlerReturn = await handler(context); //

    if ('error' in handlerReturn) {
      return {
        props: {
          error: handlerReturn.error,
        },
      };
    }

    if ('props' in handlerReturn) {
      return {
        props: {
          props: await handlerReturn.props,
        },
      };
    }

    return handlerReturn;
  };

  return wrappedHandler;
}

/**
 * Generic function for wrapping a component and (optionally) an error component to use SSR
 * @returns A wrapped component to be exported default,
 * */
function wrapWithSSR<P = {}, E = {}>(
  getServerSidePropsHandler: GetServerSidePropsHandler<P, E>,
  baseComponent: FC<P>,
  errorComponent?: FC<E>
) {
  const wrappedComponent = getWrappedComponent(baseComponent, errorComponent);
  const wrappedGetServerSideProps = withAuthSSR(getServerSidePropsHandler);

  return [wrappedComponent, wrappedGetServerSideProps];
}

/**
 * Page-specific server logic goes here, this is a typical getServerSideProps function, but with support for error property in the return value
 * @see {@link GetServerSidePropsHandler}
 * */
const getServerSidePropsHandler: GetServerSidePropsHandler<
  IBaseComponent,
  IErrorComponent
> = async (ctx) => {
  const isError = false; // Change this property to mimic error generation within server logic

  // To access data from the incoming HTTP request that renders this page, use the ctx parameter
  // console.log(Object.keys(ctx))

  if (isError) {
    return {
      error: {
        message: 'This is a sample error message',
        status: 500,
      },
    };
  }

  return {
    props: {
      text: 'Hello world',
    },
  };
};

// Call the wrapper function with custom getServerSidePropsHandler, the normal and the error component
const [SSREnabledComponent, getServerSideProps] = wrapWithSSR(
  getServerSidePropsHandler,
  BaseComponent,
  ErrorComponent
);

// Export the variables for NextJS to pick up
export default SSREnabledComponent;
export { getServerSideProps };
