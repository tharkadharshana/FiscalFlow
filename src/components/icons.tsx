import type { SVGProps } from "react";

export const Icons = {
  apple: (props: SVGProps<SVGSVGElement>) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M12 20.94c1.5 0 2.75 1.06 4 1.06 3 0 6-8 6-12.22A4.91 4.91 0 0 0 17 5c-2.22 0-4 1.44-5 2-1-.56-2.78-2-5-2a4.9 4.9 0 0 0-5 4.78C2 14 5 22 8 22c1.25 0 2.5-1.06 4-1.06Z" />
      <path d="M10 2c1 .5 2 2 2 5" />
    </svg>
  ),
  google: (props: SVGProps<SVGSVGElement>) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        {...props}
    >
        <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.85 3.18-1.78 4.13-1.14 1.13-3.01 2.4-5.52 2.4-4.54 0-8.28-3.73-8.28-8.28s3.74-8.28 8.28-8.28c2.48 0 4.38.94 5.75 2.25l2.43-2.31C18.26.47 15.6.01 12.48 0 5.88 0 0 5.88 0 12.48s5.88 12.48 12.48 12.48c6.94 0 12.06-4.84 12.06-12.06 0-.82-.07-1.58-.2-2.32H12.48z"/>
    </svg>
  ),
};
