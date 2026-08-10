type FormAttentionCueProps = {
  attentionRequest?: number;
};

const FormAttentionCue = ({ attentionRequest = 0 }: FormAttentionCueProps) => {
  if (attentionRequest === 0) return null;

  return (
    <span
      key={attentionRequest}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 rounded-xl border-2 border-(--color-warning) opacity-0 motion-safe:animate-ping"
      style={{ animationIterationCount: 2 }}
    />
  );
};

export default FormAttentionCue;
