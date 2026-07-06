function escapeXml(unsafe) {
  return unsafe.replace(/[<>&'"]/g, function (c) {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
    }
  });
}

function parseMarkdownLine(line) {
  const tokens = [];
  let i = 0;
  while (i < line.length) {
    if (line.substr(i, 2) === '**') {
      const end = line.indexOf('**', i + 2);
      if (end !== -1) {
        tokens.push({ text: line.substring(i + 2, end), bold: true });
        i = end + 2;
        continue;
      }
    }
    if (line.substr(i, 1) === '*') {
      const end = line.indexOf('*', i + 1);
      if (end !== -1) {
        tokens.push({ text: line.substring(i + 1, end), italic: true });
        i = end + 1;
        continue;
      }
    }
    
    let nextBold = line.indexOf('**', i);
    let nextItalic = line.indexOf('*', i);
    if (nextItalic === nextBold) {
      // ** is also matched by *
      nextItalic = -1; // Ignore the single star if it's part of **
    } else if (nextBold !== -1 && nextItalic === nextBold) {
        // This won't happen because indexOf finds exact match.
    }
    // Careful: if ** is at index 5, nextBold=5, nextItalic=5.
    // We should search for * but if it's followed by *, it's a bold.
    let nextForm = -1;
    for (let j = i; j < line.length; j++) {
      if (line[j] === '*') {
        nextForm = j;
        break;
      }
    }

    if (nextForm === -1) {
      tokens.push({ text: line.substring(i) });
      break;
    } else {
      if (nextForm > i) {
        tokens.push({ text: line.substring(i, nextForm) });
      }
      i = nextForm;
    }
  }
  return tokens;
}

function markdownToOpenXml(text) {
  const lines = text.split('\n');
  let xml = '';
  for (const line of lines) {
    xml += '<w:p>';
    const tokens = parseMarkdownLine(line);
    for (const token of tokens) {
      let rPr = '';
      if (token.bold) rPr += '<w:b/>';
      if (token.italic) rPr += '<w:i/>';
      const rPrXml = rPr ? `<w:rPr>${rPr}</w:rPr>` : '';
      xml += `<w:r>${rPrXml}<w:t xml:space="preserve">${escapeXml(token.text)}</w:t></w:r>`;
    }
    xml += '</w:p>';
  }
  return xml;
}

console.log(markdownToOpenXml("Logiciel **Paye**, Version *ULTRALIGHT*\n• Monitoring régulier\n• **Mises** à jour"));
