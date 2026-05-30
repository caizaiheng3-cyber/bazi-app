interface Props {
  file: string
}

export default function ImpactBadge({ file }: Props) {
  const shortName = file.split('/').pop() || file

  return (
    <span className="impact-badge" title={file}>
      {shortName}
    </span>
  )
}
