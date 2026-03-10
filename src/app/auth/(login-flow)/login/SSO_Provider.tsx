// Array of SSO providers
export const ssoProviders = [
  { 
    name : 'microsoft_sso',
    label: "Continue with Microsoft SSO",
    icon: (
      <svg className='!h-[23px] !w-[23px]' width='23' height='23' viewBox='0 0 24 25' xmlns='http://www.w3.org/2000/svg'>
        <path fill='#f3f3f3' d='M0 0h23v23H0z' />
        <path fill='#f35325' d='M1 1h10v10H1z' />
        <path fill='#81bc06' d='M12 1h10v10H12z' />
        <path fill='#05a6f0' d='M1 12h10v10H1z' />
        <path fill='#ffba08' d='M12 12h10v10H12z' />
      </svg>
    )
  },
  {
    name : 'google_sso',
    label: "Continue with Google",
    icon: (
      <svg className="!w-6 !h-6" xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="56" height="56" viewBox="0 0 48 48">
        <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path>
        <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path>
        <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"></path>
        <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"></path>
      </svg>
    )
  },
  {
    name : 'linkedin_sso',
    label: "Continue with Linkedin",
    icon: (
      <svg className="!w-6 !h-6" width="800px" height="800px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <g id="SVGRepo_bgCarrier" strokeWidth="0"/>
        <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"/>
        <g id="SVGRepo_iconCarrier">
          <path d="M18 22V15C18 13.8954 17.1046 13 16 13C14.8954 13 14 13.8954 14 15V22H10" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M10 22V15C10 11.6863 12.6863 9 16 9C19.3137 9 22 11.6863 22 15V22H18" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <rect x="3" y="9" width="4" height="13" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <circle cx="5" cy="4" r="2" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </g>
      </svg>
    )
  },
  {
    name : 'okta_sso',
    label: "Continue with Okta",
    icon: (
      <svg height="16" width="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill="none">
        <path fill="#007DC1" d="M8 1C4.143 1 1 4.12 1 8s3.121 7 7 7 7-3.121 7-7-3.143-7-7-7zm0 10.5c-1.94 0-3.5-1.56-3.5-3.5S6.06 4.5 8 4.5s3.5 1.56 3.5 3.5-1.56 3.5-3.5 3.5z"></path>
      </svg>
    )
  }
];
