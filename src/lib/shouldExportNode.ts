export function shouldExportNode(node: Node): boolean {
  if (!(node instanceof HTMLElement)) return true;
  if (node.hasAttribute('data-export-exclude')) return false;
  if (node.hasAttribute('data-export-include')) return true;
  return !(
    node.tagName === 'BUTTON' ||
    node.classList.contains('react-flow__controls')
  );
}
