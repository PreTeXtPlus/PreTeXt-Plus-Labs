export interface FormProps<B> {
  body: B
  onChange: (body: B) => void
}

/** Returns a setter that merges a patch into the body. */
export const patcher =
  <B,>({ body, onChange }: FormProps<B>) =>
  (patch: Partial<B>) =>
    onChange({ ...body, ...patch })
