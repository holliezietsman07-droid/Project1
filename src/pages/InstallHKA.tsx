import { Download, Monitor, Smartphone } from 'lucide-react';

const platforms = [
  { label: 'iPhone', icon: Smartphone, steps: ['Open HKA in Safari.', 'Tap Share, then Add to Home Screen.', 'If shown, turn on Open as Web App. Tap Add.'] },
  { label: 'Android', icon: Smartphone, steps: ['Open HKA in Chrome.', 'Tap the three-dot menu, then Add to home screen.', 'Choose Install if prompted.'] },
  { label: 'Desktop', icon: Monitor, steps: ['Open HKA in Chrome.', 'Open the three-dot menu and choose Cast, save and share.', 'Choose Install page as app.'] },
];

export default function InstallHKA() {
  return <section className='page-width py-10 lg:py-16'>
    <Download className='mb-4 size-7 text-primary' aria-hidden='true' />
    <h1 className='section-heading text-4xl'>Install HKA</h1>
    <p className='mt-3 text-muted-foreground'>Open the academy from your home screen or desktop using your existing HKA account.</p>
    <div className='mt-8 grid gap-4 md:grid-cols-3'>
      {platforms.map(({ label, icon: Icon, steps }) => <section className='paper-card p-5' key={label}>
        <Icon className='mb-3 size-5 text-primary' aria-hidden='true' />
        <h2 className='font-serif text-2xl'>{label}</h2>
        <ol className='mt-3 list-decimal space-y-2 pl-5 text-sm text-muted-foreground'>
          {steps.map(step => <li key={step}>{step}</li>)}
        </ol>
      </section>)}
    </div>
  </section>;
}
