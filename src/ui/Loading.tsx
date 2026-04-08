function Loading() {
  return (
    <div className='page flex items-center justify-center' role='status' aria-label='Loading'>
      <div className='text-center space-y-4'>
        <div className='w-16 h-16 border-4 border-foreground/20 border-t-accent rounded-full animate-spin mx-auto' aria-hidden='true'></div>
        <p className='text-lg text-foreground/60'>Loading...</p>
      </div>
    </div>
  );
}

export default Loading;
