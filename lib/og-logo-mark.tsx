/** The CardShare.ai mark, for `ImageResponse` images (Satori needs inline SVG). */
export function OgLogoMark({ size = 48 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M77.0833 0H22.9167C10.2601 0 0 10.2601 0 22.9167V77.0833C0 89.7399 10.2601 100 22.9167 100H77.0833C89.7399 100 100 89.7399 100 77.0833V22.9167C100 10.2601 89.7399 0 77.0833 0Z"
        fill="#ff5a4a"
      />
      <path
        d="M50 14C53 35 65.0001 47 86 50C65.0001 53 53 65.0001 50 86C47 65.0001 35 53 14 50C35 47 47 35 50 14Z"
        fill="white"
      />
    </svg>
  )
}
