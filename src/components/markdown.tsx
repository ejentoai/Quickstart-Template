// import Link from 'next/link';
import React, { memo, useEffect } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from 'rehype-raw'
import he from 'he';
import { getEjentoAccessToken } from "@/cookie";
const handleCitationDownload = (filePath: string) => {
  if (
    filePath &&
    filePath?.length >= 35 &&
    filePath?.length <= 60 &&
    filePath.includes("-") &&
    filePath.split("-")?.length === 6
  ) {
    window.open(filePath, "_blank");
  } else {
    window.open(filePath, "_blank");
  }
};

// (window as any).handleCitationDownload = (filePath: string) => {
//   if (filePath && filePath?.length >= 35 && filePath?.length <= 60 && filePath.includes('-') && filePath.split('-')?.length === 6) {
//     window.open(filePath, '_blank');
//   } else {
//     window.open(filePath, '_blank');
//   }
// };

const handleDownload = (func: any) => {
  handleCitationDownload(func.slice(24, -2));
};

const NonMemoizedMarkdown = ({
  children,
  message,
}: {
  children: string;
  message?: any;
}) => {
  // const { message } = props;
  // useEffect(() => {
  //   console.log("message123", message);
  // }, [message]);
  const access_token = getEjentoAccessToken();
  function extractNumberFromUrl(url: string) {
    const match = url?.match(/fn-(\d+)%5E/);
    return match ? parseInt(match[1], 10) : null;
  }
  const components: Partial<Components> = {
    table : ({node, children, ...props}) => {
      return (
        <div className="overflow-x-auto min-w-[600px] max-w-[730px]">
          <table className="w-full table-auto styled-table" {...props}>
            {children}
          </table>
        </div>
      )
    },
    code: ({ node, inline, className, children, ...props }) => {
      const match = /language-(\w+)/.exec(className || "");
      return !inline && match ? (
        <pre
          {...props}
          className={`${className} text-sm w-[80dvw] md:max-w-[500px] overflow-x-scroll bg-zinc-100 p-3 rounded-lg mt-2 dark:bg-zinc-800`}
        >
          <code className={match[1]}>{children}</code>
        </pre>
      ) : (
        <code
          className={`${className} text-sm bg-zinc-100 dark:bg-zinc-800 py-0.5 px-1 rounded-md`}
          {...props}
        >
          {children}
        </code>
      );
    },
    ol: ({ node, children, ...props }) => {
      return (
        <ol className="list-decimal list-outside ml-4" {...props}>
          {children}
        </ol>
      );
    },
    li: ({ node, children, ...props }) => {
      return (
        <li className="py-1" {...props}>
          {children}
        </li>
      );
    },
    ul: ({ node, children, ...props }) => {
      return (
        <ul className="list-decimal list-outside ml-4" {...props}>
          {children}
        </ul>
      );
    },
    strong: ({ node, children, ...props }) => {
      return (
        <span className="font-semibold w-max" {...props}>
          {children}
        </span>
      );
    },
    sup: ({ node, children, ...props }) => {
      // console.log("nodep", node);
      // if (props.href?.includes('-fnref-')) {
      //   return (
      //     <sup className="hidden" {...props}>
      //       {children}
      //     </sup>
      //   );
      // } else {

      // console.log("numberUrl", node)
      let number = extractNumberFromUrl(
        node?.children?.at(0)?.properties?.href
      );
      if (number) {
        let numberUrl = message?.references?.find(
          (x: any) => number == x.number
        )?.url;
        if (!numberUrl) {
          return "";
        }
      }
      return (
        <sup className="sup" {...props}>
          {children}
        </sup>
      );
      // }
    },
    a: (props) => {
      const { node, children, ...rest } = props;
      // if(node?.children[0]?.value?.length === 1 && node?.children[0]?.value?.match(/\d/)) {
      //   console.log("sad", node)
      //   return <a {...props}>{children}</a>
      // }

      // return (
      //   <a href={`${process.env.NEXT_PUBLIC_CITATION_URL}${message?.references?.find((x:any) => number == x.number)?.url}`} target="_blank" className="text-white hover:underline">
      //     <sup {...props}>{number}</sup>
      //   </a>
      // )
      // }
      let number = extractNumberFromUrl(props?.href);
      if (number) {
        let numberUrl = message?.references?.find(
          (x: any) => number == x.number
        )?.url;

        if (numberUrl?.includes("https://") || numberUrl?.includes("www.")) {
          // node.children?.at(0)?.properties?.href = `${process.env.NEXT_PUBLIC_CITATION_URL}${numberUrl}`
          return (
            <a
              href={`${numberUrl}`}
              target="_blank"
              className="text-blue-900 hover:underline"
            >
              {message?.references?.find((x: any) => number == x.number)?.order}
            </a>
          );
        } else {
          return  (
            <a
              href={`${''}${numberUrl}?access_token=${access_token}`}
              target="_blank"
              className="text-blue-900 hover:underline"
            >
              {number}
            </a>
          );
        }
      }
      if (props?.href?.match(/fn-(\d+)%5E/)) {
        let fileTempUrl = message?.references?.find(
          (x: any) =>
            parseInt(props?.href?.match(/fn-(\d+)%5E/)[1], 10) == x.number
        )?.url;
        let fileUrl;
        if (
          fileTempUrl?.includes("https://") ||
          fileTempUrl?.includes("www.")
        ) {
          fileUrl = fileTempUrl;
        } else {
          fileUrl = '' + fileTempUrl + `?access_token=${access_token}`;
        }
        return (
          <a
            href={fileUrl}
            target="_blank"
            className="text-blue-900 hover:underline"
          >
            {props?.node?.children?.at(0)?.value}
          </a>
        );
      }

      if (props.href?.includes("-fnref-")) {
        return (
          <a className="hidden" {...props}>
            {children}
          </a>
        );
      }

      if (props.node) {
        const childElement = props.node?.children[0] as {
          type: string;
          tagName: string;
          properties: Record<string, any>;
          children: any[];
          position: Record<string, any>;
        };

        const childChildren = childElement?.children;

        if (childChildren?.length > 0 && childChildren[0]?.type === "text") {
          const value = childChildren[0]?.value;
          // console.log("value", value, childChildren);
          if (props?.href) {
            return (
              <a href={props?.href} target="_blank">
                <sup className={"sup"}>{value}</sup>
              </a>
            );
          } else if (props?.onClick) {
            return (
              <a onClick={() => handleDownload(props?.onClick)} target="_blank">
                <sup className={"sup"}>{value}</sup>
              </a>
            );
          }
        } else {
          // return <a target="_blank" className={"underline"} {...rest}>{children}</a>;
          if (
            props?.href?.includes("https://") ||
            props?.href?.includes("www.")
          ) {
            // i want to check if this node inner html contains a string whose length is 1 and is a number
            if (
              props.node?.children[0]?.value?.length < 3 &&
              props.node?.children[0]?.value?.match(/\d/)
            ) {
              return (
                <a
                  className="text-blue-800 hover:underline bg-[#D1DBFA] text-[10px] p-1 m-0.5 rounded-sm"
                  target="_blank"
                  rel="noreferrer"
                  {...props}
                >
                  {children}
                </a>
              );
            } else {
              return (
                <a
                  className="text-blue-500 hover:underline"
                  target="_blank"
                  rel="noreferrer"
                  {...props}
                >
                  {children}
                </a>
              );
            }
          } else {
            // if((props?.href)?.includes("#user-content")) {
            //   return ('')
            // } else {
            if (
              props.node?.children[0]?.value?.length < 3 &&
              props.node?.children[0]?.value?.match(/\d/)
            ) {
              return (
                <a
                  className="text-blue-800 hover:underline bg-[#D1DBFA] text-[10px] p-1 m-0.5 rounded-sm"
                  target="_blank"
                  rel="noreferrer"
                  {...props}
                >
                  {children}
                </a>
              );
            } 
            else if (
              // Check if the href looks like an email address
              props?.href?.match(/^mailto:/) || 
              props?.href?.match(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)
            ) {
              // For email links, use the href directly without modifying it
              return (
                <a
                  className="text-blue-500 hover:underline"
                  target="_blank"
                  rel="noreferrer"
                  href={props?.href}
                >
                  {children}
                </a>
              );
            } 
            else {
              return (
                <a
                  className="text-blue-500 hover:underline"
                  target="_blank"
                  rel="noreferrer"
                  href={`${''}${props?.href}?access_token=${access_token}`}
                  // {...props}
                >
                  {children}
                </a>
              );
            }
            // }
          }
        }
      } else {
        // return <a target="_blank" className={"underline"} {...rest}>{children}</a>;
        // console.log(props?.href)
        return (
          <a
            className="text-blue-500 hover:underline"
            target="_blank"
            rel="noreferrer"
            {...props}
          >
            {children}
          </a>
        );
      }
    },
    // a(props) {
    //   const { children, ...rest } = props;

    //   if (props.node) {
    //     const childElement = props.node.children[0] as {
    //       type: string;
    //       tagName: string;
    //       properties: Record<string, any>;
    //       children: any[];
    //       position: Record<string, any>;
    //     };

    //     const childChildren = childElement.children;

    //     if (childChildren?.length > 0 && childChildren[0].type === 'text') {
    //       const value = childChildren[0].value;

    //       if (props.href) {
    //         return (
    //           <a href={props.href} target="_blank">
    //             <sup className={'sup'}>{value}</sup>
    //           </a>
    //         );
    //       } else if (props.onClick) {
    //         return (
    //           <a onClick={() => handleDownload(props.onClick)} target="_blank">
    //             <sup className={'sup'}>{value}</sup>
    //           </a>
    //         );
    //       }
    //     } else {
    //       return <a target="_blank" className={"underline"} {...rest}>{children}</a>;
    //     }
    //   } else {
    //     return <a target="_blank" className={"underline"} {...rest}>{children}</a>;
    //   }
    // },
    // a: ({ node, children, ...props }) => {

    // },
    h1: ({ node, children, ...props }) => {
      return (
        <h1 className="text-3xl font-semibold mt-[0.1rem] mb-2" {...props}>
          {children}
        </h1>
      );
    },
    h2: ({ node, children, ...props }) => {
      return (
        <h2 className="text-2xl font-semibold mt-[0.1rem] mb-2" {...props}>
          {children}
        </h2>
      );
    },
    h3: ({ node, children, ...props }) => {
      return (
        <h3 className="text-xl font-semibold mt-[0.1rem] mb-2" {...props}>
          {children}
        </h3>
      );
    },
    h4: ({ node, children, ...props }) => {
      return (
        <h4 className="text-lg font-semibold mt-[0.1rem] mb-2" {...props}>
          {children}
        </h4>
      );
    },
    h5: ({ node, children, ...props }) => {
      return (
        <h5 className="text-base font-semibold mt-[0.1rem] mb-2" {...props}>
          {children}
        </h5>
      );
    },
    h6: ({ node, children, ...props }) => {
      return (
        <h6 className="text-sm font-semibold mt-[0.1rem] mb-2" {...props}>
          {children}
        </h6>
      );
    },
  };

  return (
    <ReactMarkdown rehypePlugins={[rehypeRaw]} remarkPlugins={[remarkGfm]} components={components}>
      {he?.decode(children)}
    </ReactMarkdown>
  );
};

export const Markdown = memo(
  NonMemoizedMarkdown,
  (prevProps, nextProps) =>
    prevProps.children === nextProps.children &&
    prevProps.message === nextProps.message
);
