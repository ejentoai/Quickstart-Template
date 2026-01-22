export function CardDisclaimer() {
    return (
      <div className="text-center text-muted-foreground text-[11px] md:text-[13px]">
        By continuing, you acknowledge that you have read, understood, and agreed to our{' '}
        <a
          href="https://dev-app.ejento.ai/en/termsofuse"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#3B4055] hover:text-[#db4a2b]"
        >
          Terms of Service
        </a>{' '}
        and{' '}
        <a
          href="https://dev-app.ejento.ai/en/privacypolicy"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#3B4055] hover:text-[#db4a2b]"
        >
          Privacy Policy
        </a>.
      </div>
    );
  }
  