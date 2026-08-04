import * as React from 'react'

import { cn } from '#/lib/utils.ts'

/**
 * Kleine, veilige markdown-renderer voor event-inhoud (omschrijving,
 * agenda/FAQ/spreker/huisregel-teksten).
 *
 * Ondersteunt bewust een beperkte subset: **vet**, *cursief*, [links](url),
 * bullet- en genummerde lijsten, en alinea's/regeleinden. Er is geen
 * doorgeefluik voor ruwe HTML en we gebruiken nergens
 * `dangerouslySetInnerHTML` — alle output bestaat uit React-elementen, dus
 * gebruikersinvoer (bijv. een `<script>`-tag) komt altijd als platte tekst
 * op het scherm terecht, nooit als uitvoerbare opmaak.
 */

type Block =
  | { kind: 'paragraph'; lines: Array<string> }
  | { kind: 'bullet-list'; items: Array<string> }
  | { kind: 'ordered-list'; items: Array<string> }

function parseBlocks(text: string): Array<Block> {
  const lines = text.replace(/\r\n/g, '\n').split('\n')
  const blocks: Array<Block> = []

  let paragraphLines: Array<string> = []
  let listItems: Array<string> = []
  let listKind: 'bullet-list' | 'ordered-list' | null = null

  function flushParagraph() {
    if (paragraphLines.length > 0) {
      blocks.push({ kind: 'paragraph', lines: paragraphLines })
      paragraphLines = []
    }
  }

  function flushList() {
    if (listKind && listItems.length > 0) {
      blocks.push({ kind: listKind, items: listItems })
    }
    listItems = []
    listKind = null
  }

  for (const rawLine of lines) {
    const line = rawLine.trim()
    const bulletMatch = /^[-*]\s+(.*)$/.exec(line)
    const orderedMatch = /^\d+[.)]\s+(.*)$/.exec(line)

    if (bulletMatch) {
      flushParagraph()
      if (listKind !== 'bullet-list') flushList()
      listKind = 'bullet-list'
      listItems.push(bulletMatch[1] ?? '')
    } else if (orderedMatch) {
      flushParagraph()
      if (listKind !== 'ordered-list') flushList()
      listKind = 'ordered-list'
      listItems.push(orderedMatch[1] ?? '')
    } else if (line === '') {
      flushParagraph()
      flushList()
    } else {
      flushList()
      paragraphLines.push(rawLine)
    }
  }
  flushParagraph()
  flushList()

  return blocks
}

/** Splitst een regel op **vet**, *cursief* en [tekst](url) in React-nodes. */
function renderInline(line: string): Array<React.ReactNode> {
  const pattern =
    /\*\*(.+?)\*\*|\*(.+?)\*|\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g
  const nodes: Array<React.ReactNode> = []
  let lastIndex = 0
  let match: RegExpExecArray | null
  let key = 0

  while ((match = pattern.exec(line))) {
    if (match.index > lastIndex) {
      nodes.push(line.slice(lastIndex, match.index))
    }

    if (match[1] !== undefined) {
      nodes.push(<strong key={key++}>{match[1]}</strong>)
    } else if (match[2] !== undefined) {
      nodes.push(<em key={key++}>{match[2]}</em>)
    } else if (match[3] !== undefined && match[4] !== undefined) {
      nodes.push(
        <a
          key={key++}
          href={match[4]}
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-2 hover:no-underline"
        >
          {match[3]}
        </a>,
      )
    }

    lastIndex = pattern.lastIndex
  }

  if (lastIndex < line.length) nodes.push(line.slice(lastIndex))

  return nodes
}

function renderLines(lines: Array<string>): Array<React.ReactNode> {
  const nodes: Array<React.ReactNode> = []
  lines.forEach((line, index) => {
    if (index > 0) nodes.push(<br key={`br-${index}`} />)
    nodes.push(...renderInline(line))
  })
  return nodes
}

export function Markdown({
  children,
  className,
}: {
  children: string | null | undefined
  className?: string
}) {
  if (!children) return null
  const blocks = parseBlocks(children)
  if (blocks.length === 0) return null

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {blocks.map((block, index) => {
        if (block.kind === 'paragraph') {
          return <p key={index}>{renderLines(block.lines)}</p>
        }
        if (block.kind === 'bullet-list') {
          return (
            <ul key={index} className="list-disc space-y-1 pl-5">
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>{renderInline(item)}</li>
              ))}
            </ul>
          )
        }
        return (
          <ol key={index} className="list-decimal space-y-1 pl-5">
            {block.items.map((item, itemIndex) => (
              <li key={itemIndex}>{renderInline(item)}</li>
            ))}
          </ol>
        )
      })}
    </div>
  )
}
