export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      justifyContent: 'center',
      padding: '3rem 1rem',
      backgroundColor: 'var(--background)'
    }}>
      <div style={{
        margin: '0 auto',
        width: '100%',
        maxWidth: '24rem',
        textAlign: 'center'
      }}>
      </div>
      {children}
    </div>
  );
}
