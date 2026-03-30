const state = {
  documents: [],
  selectedDocId: null,
  selectedLine: null,
  lastUpdatedAt: null
};

const els = {
  authorInput: document.getElementById("authorInput"),
  fileInput: document.getElementById("fileInput"),
  manualForm: document.getElementById("manualForm"),
  manualTitle: document.getElementById("manualTitle"),
  manualContent: document.getElementById("manualContent"),
  docSearch: document.getElementById("docSearch"),
  docList: document.getElementById("docList"),
  docCount: document.getElementById("docCount"),
  emptyState: document.getElementById("emptyState"),
  docWorkspace: document.getElementById("docWorkspace"),
  docTitleText: document.getElementById("docTitleText"),
  docMeta: document.getElementById("docMeta"),
  deleteDocBtn: document.getElementById("deleteDocBtn"),
  markdownPreview: document.getElementById("markdownPreview"),
  lineView: document.getElementById("lineView"),
  selectedLineLabel: document.getElementById("selectedLineLabel"),
  toggleImportantBtn: document.getElementById("toggleImportantBtn"),
  commentForm: document.getElementById("commentForm"),
  commentTarget: document.getElementById("commentTarget"),
  commentText: document.getElementById("commentText"),
  commentList: document.getElementById("commentList"),
  summaryBtn: document.getElementById("summaryBtn"),
  downloadSummaryBtn: document.getElementById("downloadSummaryBtn"),
  summaryOutput: document.getElementById("summaryOutput"),
  statusText: document.getElementById("statusText")
};

function setStatus(message) {
  if (els.statusText) {
    els.statusText.textContent = message;
  }
}

function escapeHtml(input) {
  return (input || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function inlineMarkdown(input) {
  const escaped = escapeHtml(input);
  return escaped
    .replace(/`([^`]+?)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+?)\*/g, "<em>$1</em>")
    .replace(
      /\[([^\]]+?)\]\((https?:\/\/[^\s)]+)\)/g,
      '<a href="$2" target="_blank" rel="noreferrer">$1</a>'
    );
}

function renderFencedCodeBlock(codeLines, language, lineNumber) {
  const lang = (language || "").toLowerCase();
  const code = codeLines.join("\n");
  const lineAttr = lineNumber ? ' data-line="' + lineNumber + '"' : "";

  if (lang === "mermaid") {
    return '<div class="mermaid"' + lineAttr + ">" + escapeHtml(code) + "</div>";
  }

  const safeLang = lang ? ' class="language-' + escapeHtml(lang) + '"' : "";
  return "<pre" + lineAttr + "><code" + safeLang + ">" + escapeHtml(code) + "</code></pre>";
}

function markdownToHtml(markdown) {
  const lines = (markdown || "").replace(/\r\n/g, "\n").split("\n");
  const html = [];
  let inCode = false;
  let codeLanguage = "";
  let codeBuffer = [];
  let codeStartLine = null;
  let inUl = false;
  let inOl = false;

  function closeLists() {
    if (inUl) {
      html.push("</ul>");
      inUl = false;
    }
    if (inOl) {
      html.push("</ol>");
      inOl = false;
    }
  }

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i] || "";
    const lineNumber = i + 1;
    const fenceMatch = line.trim().match(/^```([a-zA-Z0-9_-]+)?/);

    if (fenceMatch) {
      closeLists();
      if (!inCode) {
        codeLanguage = (fenceMatch[1] || "").trim();
        codeBuffer = [];
        codeStartLine = lineNumber;
        inCode = true;
      } else {
        html.push(renderFencedCodeBlock(codeBuffer, codeLanguage, codeStartLine));
        codeLanguage = "";
        codeBuffer = [];
        codeStartLine = null;
        inCode = false;
      }
      continue;
    }

    if (inCode) {
      codeBuffer.push(line);
      continue;
    }

    if (!line.trim()) {
      closeLists();
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      closeLists();
      const level = heading[1].length;
      html.push(
        "<h" + level + ' data-line="' + lineNumber + '">' + inlineMarkdown(heading[2]) + "</h" + level + ">"
      );
      continue;
    }

    const ordered = line.match(/^\s*(\d+)\.\s+(.+)$/);
    if (ordered) {
      if (inUl) {
        html.push("</ul>");
        inUl = false;
      }
      if (!inOl) {
        html.push("<ol>");
        inOl = true;
      }
      html.push('<li data-line="' + lineNumber + '">' + inlineMarkdown(ordered[2]) + "</li>");
      continue;
    }

    const unordered = line.match(/^\s*[-*]\s+(.+)$/);
    if (unordered) {
      if (inOl) {
        html.push("</ol>");
        inOl = false;
      }
      if (!inUl) {
        html.push("<ul>");
        inUl = true;
      }
      html.push('<li data-line="' + lineNumber + '">' + inlineMarkdown(unordered[1]) + "</li>");
      continue;
    }

    const quote = line.match(/^\s*>\s?(.+)$/);
    if (quote) {
      closeLists();
      html.push('<blockquote data-line="' + lineNumber + '">' + inlineMarkdown(quote[1]) + "</blockquote>");
      continue;
    }

    if (/^\s*---+\s*$/.test(line)) {
      closeLists();
      html.push('<hr data-line="' + lineNumber + '" />');
      continue;
    }

    closeLists();
    html.push('<p data-line="' + lineNumber + '">' + inlineMarkdown(line) + "</p>");
  }

  if (inCode) {
    html.push(renderFencedCodeBlock(codeBuffer, codeLanguage, codeStartLine));
  }
  if (inUl) {
    html.push("</ul>");
  }
  if (inOl) {
    html.push("</ol>");
  }

  return html.join("");
}

function renderMermaidInPreview() {
  if (!window.mermaid || !els.markdownPreview) {
    return;
  }

  const hasMermaidNode = !!els.markdownPreview.querySelector(".mermaid");
  if (!hasMermaidNode) {
    return;
  }

  if (!window.__mdManagerMermaidInitialized) {
    window.mermaid.initialize({
      startOnLoad: false,
      securityLevel: "loose",
      theme: "default"
    });
    window.__mdManagerMermaidInitialized = true;
  }

  window.mermaid.run({ querySelector: "#markdownPreview .mermaid" }).catch(function () {
    const nodes = els.markdownPreview.querySelectorAll(".mermaid");
    nodes.forEach(function (node) {
      const source = node.textContent || "";
      node.innerHTML =
        '<p class="mermaid-error">Mermaid render failed</p><pre><code>' +
        escapeHtml(source) +
        "</code></pre>";
    });
  });
}

function renderMarkdownPreview(content) {
  if (!els.markdownPreview) {
    return;
  }
  els.markdownPreview.innerHTML = markdownToHtml(content);
  renderMermaidInPreview();
}

function updatePreviewLineState(doc) {
  if (!els.markdownPreview) {
    return;
  }

  const blocks = Array.from(els.markdownPreview.querySelectorAll("[data-line]"));
  const importantSet = new Set((doc && doc.importantLines) || []);
  let selectedBlock = null;
  let closestDistance = Number.MAX_SAFE_INTEGER;

  blocks.forEach(function (block) {
    const line = Number(block.getAttribute("data-line"));
    const isImportant = importantSet.has(line);
    block.classList.toggle("preview-important", isImportant);

    if (state.selectedLine) {
      const distance = Math.abs(line - state.selectedLine);
      if (distance < closestDistance) {
        closestDistance = distance;
        selectedBlock = block;
      }
    }
  });

  blocks.forEach(function (block) {
    block.classList.remove("preview-selected");
  });
  if (selectedBlock) {
    selectedBlock.classList.add("preview-selected");
  }
}

function selectLine(lineNumber, options) {
  const opts = options || {};
  const doc = getSelectedDoc();
  if (!doc) {
    state.selectedLine = null;
    return;
  }

  const maxLine = lineCountOf(doc.content);
  const candidate = Number(lineNumber);
  if (Number.isInteger(candidate) && candidate >= 1 && candidate <= maxLine) {
    state.selectedLine = candidate;
  } else {
    state.selectedLine = null;
  }

  els.selectedLineLabel.textContent = state.selectedLine ? String(state.selectedLine) : "없음";
  renderLineView(doc.content, doc.importantLines || []);
  updatePreviewLineState(doc);

  if (opts.scrollLineView && state.selectedLine) {
    const row = els.lineView.querySelector('[data-line="' + state.selectedLine + '"]');
    if (row) {
      row.scrollIntoView({ block: "nearest" });
    }
  }

  if (opts.autoTargetLine && state.selectedLine && els.commentTarget.value !== "line") {
    els.commentTarget.value = "line";
  }
}

async function apiFetch(path, options) {
  const init = {
    method: options && options.method ? options.method : "GET",
    headers: { "Content-Type": "application/json" }
  };

  if (options && options.body !== undefined) {
    init.body = JSON.stringify(options.body);
  }

  const response = await fetch(path, init);
  if (!response.ok) {
    let errorMessage = "Request failed (" + response.status + ")";
    try {
      const payload = await response.json();
      if (payload && payload.error) {
        errorMessage = payload.error;
      }
    } catch (e) {
      // ignore
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

function getSelectedDoc() {
  for (let i = 0; i < state.documents.length; i += 1) {
    if (state.documents[i].id === state.selectedDocId) {
      return state.documents[i];
    }
  }
  return null;
}

function lineCountOf(content) {
  return content ? content.split("\n").length : 1;
}

function renderDocList() {
  const query = (els.docSearch.value || "").trim().toLowerCase();
  const filtered = state.documents.filter(function (doc) {
    if (!query) {
      return true;
    }
    return doc.title.toLowerCase().indexOf(query) >= 0 || doc.content.toLowerCase().indexOf(query) >= 0;
  });

  els.docCount.textContent = filtered.length + "개";
  els.docList.innerHTML = "";

  if (filtered.length === 0) {
    const li = document.createElement("li");
    li.className = "doc-item";
    li.textContent = "검색 결과가 없습니다.";
    els.docList.appendChild(li);
    return;
  }

  filtered.forEach(function (doc) {
    const li = document.createElement("li");
    li.className = "doc-item" + (doc.id === state.selectedDocId ? " active" : "");
    li.innerHTML =
      '<div class="doc-item-head">' +
      '<button class="doc-title-btn" type="button" data-doc-id="' +
      doc.id +
      '">' +
      escapeHtml(doc.title) +
      "</button>" +
      "<span>" +
      lineCountOf(doc.content) +
      "L</span></div>" +
      "<p>중요 " +
      ((doc.importantLines && doc.importantLines.length) || 0) +
      " / 코멘트 " +
      ((doc.comments && doc.comments.length) || 0) +
      "</p>";
    els.docList.appendChild(li);
  });
}

function renderLineView(content, importantLines) {
  const lines = (content || "").split("\n");
  const importantSet = new Set(importantLines || []);
  els.lineView.innerHTML = "";

  lines.forEach(function (line, index) {
    const lineNumber = index + 1;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "line-row";
    button.dataset.line = String(lineNumber);

    if (importantSet.has(lineNumber)) {
      button.classList.add("important");
    }
    if (state.selectedLine === lineNumber) {
      button.classList.add("selected");
    }

    const safeText = line.length > 0 ? escapeHtml(line) : "&nbsp;";
    button.innerHTML = '<span class="line-num">' + lineNumber + "</span><span>" + safeText + "</span>";
    els.lineView.appendChild(button);
  });
}

function renderComments(doc) {
  const comments = (doc.comments || []).slice().sort(function (a, b) {
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  els.commentList.innerHTML = "";
  if (!comments.length) {
    const item = document.createElement("li");
    item.className = "comment-item";
    item.textContent = "등록된 코멘트가 없습니다.";
    els.commentList.appendChild(item);
    return;
  }

  comments.forEach(function (comment) {
    const lineLabel = comment.targetType === "line" ? "L" + comment.lineNumber : "문서";
    const dateLabel = new Date(comment.createdAt).toLocaleString("ko-KR");
    const item = document.createElement("li");
    item.className = "comment-item";
    item.innerHTML =
      '<div class="comment-head">' +
      "<span>[" +
      lineLabel +
      "] " +
      escapeHtml(comment.author) +
      " · " +
      dateLabel +
      '</span><button type="button" data-comment-id="' +
      comment.id +
      '">삭제</button></div><p class="comment-text">' +
      escapeHtml(comment.text) +
      "</p>";
    els.commentList.appendChild(item);
  });
}

function renderWorkspace() {
  const doc = getSelectedDoc();
  if (!doc) {
    els.emptyState.classList.remove("hidden");
    els.docWorkspace.classList.add("hidden");
    els.selectedLineLabel.textContent = "없음";
    els.commentList.innerHTML = "";
    els.summaryOutput.value = "";
    return;
  }

  els.emptyState.classList.add("hidden");
  els.docWorkspace.classList.remove("hidden");
  els.docTitleText.textContent = doc.title;
  els.docMeta.textContent =
    "생성: " +
    new Date(doc.createdAt).toLocaleString("ko-KR") +
    " / 최종 수정: " +
    new Date(doc.updatedAt).toLocaleString("ko-KR") +
    " / 출처: " +
    doc.source;

  renderMarkdownPreview(doc.content);
  selectLine(state.selectedLine);
  renderComments(doc);
}

function renderAll() {
  renderDocList();
  renderWorkspace();
}

async function syncDocs(opts) {
  const options = opts || {};
  const payload = await apiFetch("/api/docs/");

  if (options.silent && payload.updatedAt === state.lastUpdatedAt) {
    return;
  }

  state.lastUpdatedAt = payload.updatedAt;
  state.documents = Array.isArray(payload.documents) ? payload.documents : [];

  if (!state.documents.length) {
    state.selectedDocId = null;
    state.selectedLine = null;
  } else {
    const stillExists = state.documents.some(function (doc) {
      return doc.id === state.selectedDocId;
    });
    if (!state.selectedDocId || !stillExists) {
      state.selectedDocId = state.documents[0].id;
      state.selectedLine = null;
    }
  }

  renderAll();
  if (!options.silent) {
    setStatus("동기화 완료 (" + new Date().toLocaleTimeString("ko-KR") + ")");
  }
}

async function createDocument(title, content, source) {
  await apiFetch("/api/docs/", {
    method: "POST",
    body: { title: title, content: content, source: source }
  });
  await syncDocs();
}

async function handleFileUpload(event) {
  const files = Array.from(event.target.files || []);
  if (!files.length) {
    return;
  }

  setStatus("파일 업로드 처리 중 (" + files.length + "개)...");
  for (let i = 0; i < files.length; i += 1) {
    const file = files[i];
    const text = await file.text();
    const title = file.name.replace(/\.[^.]+$/, "");
    if (!text.trim()) {
      continue;
    }
    await createDocument(title, text, "file");
  }
  els.fileInput.value = "";
  setStatus("파일 업로드 완료 (" + files.length + "개)");
}

async function handleManualSubmit(event) {
  event.preventDefault();
  const title = (els.manualTitle.value || "").trim() || "직접 입력 문서";
  const content = els.manualContent.value || "";

  if (!content.trim()) {
    setStatus("문서 내용이 비어 있습니다.");
    return;
  }

  await createDocument(title, content, "manual");
  els.manualTitle.value = "";
  els.manualContent.value = "";
  setStatus("문서를 추가했습니다.");
}

function handleDocListClick(event) {
  const target = event.target.closest("[data-doc-id]");
  if (!target) {
    return;
  }

  const docId = Number(target.dataset.docId);
  if (!docId) {
    return;
  }

  state.selectedDocId = docId;
  state.selectedLine = null;
  renderAll();
}

function handleLineClick(event) {
  const row = event.target.closest(".line-row");
  if (!row) {
    return;
  }

  selectLine(Number(row.dataset.line), { autoTargetLine: true });
}

function handlePreviewClick(event) {
  const previewLineNode = event.target.closest("[data-line]");
  if (!previewLineNode || !els.markdownPreview.contains(previewLineNode)) {
    return;
  }

  const lineNumber = Number(previewLineNode.getAttribute("data-line"));
  if (!lineNumber) {
    return;
  }

  selectLine(lineNumber, { autoTargetLine: true, scrollLineView: true });
  setStatus("Preview line selected: L" + lineNumber);
}

function createSummaryText(doc) {
  const lines = (doc.content || "").split("\n");
  const summary = [];
  summary.push("# " + doc.title + " 리뷰 요약");
  summary.push("");
  summary.push("- 생성: " + new Date(doc.createdAt).toLocaleString("ko-KR"));
  summary.push("- 수정: " + new Date(doc.updatedAt).toLocaleString("ko-KR"));
  summary.push("- 중요 라인 수: " + (doc.importantLines || []).length);
  summary.push("- 코멘트 수: " + (doc.comments || []).length);
  summary.push("");
  summary.push("## 중요 라인");

  if (!doc.importantLines.length) {
    summary.push("- 없음");
  } else {
    doc.importantLines.forEach(function (lineNumber) {
      const text = lines[lineNumber - 1] || "";
      summary.push("- L" + lineNumber + ": " + text);
    });
  }

  summary.push("");
  summary.push("## 코멘트");

  if (!doc.comments.length) {
    summary.push("- 없음");
  } else {
    const sorted = doc.comments.slice().sort(function (a, b) {
      return new Date(a.createdAt) - new Date(b.createdAt);
    });
    sorted.forEach(function (comment) {
      const target = comment.targetType === "line" ? "L" + comment.lineNumber : "문서";
      const date = new Date(comment.createdAt).toLocaleString("ko-KR");
      summary.push("- [" + target + "] " + comment.author + " (" + date + ")");
      summary.push("  " + comment.text);
    });
  }

  return summary.join("\n");
}

async function handleDeleteDoc() {
  const doc = getSelectedDoc();
  if (!doc) {
    return;
  }

  const ok = window.confirm('"' + doc.title + '" 문서를 삭제하시겠습니까?');
  if (!ok) {
    return;
  }

  await apiFetch("/api/docs/" + doc.id + "/", { method: "DELETE" });
  await syncDocs();
  setStatus("문서를 삭제했습니다.");
}

async function handleToggleImportant() {
  const doc = getSelectedDoc();
  if (!doc) {
    setStatus("먼저 문서를 선택하세요.");
    return;
  }
  if (!state.selectedLine) {
    setStatus("중요 표시할 라인을 먼저 선택하세요.");
    return;
  }

  await apiFetch("/api/docs/" + doc.id + "/important/", {
    method: "POST",
    body: { lineNumber: state.selectedLine }
  });
  await syncDocs();
  setStatus("L" + state.selectedLine + " 중요 표시를 토글했습니다.");
}

async function handleCommentSubmit(event) {
  event.preventDefault();
  const doc = getSelectedDoc();
  if (!doc) {
    setStatus("먼저 문서를 선택하세요.");
    return;
  }

  const targetType = els.commentTarget.value === "line" ? "line" : "document";
  const text = (els.commentText.value || "").trim();

  if (!text) {
    setStatus("코멘트 내용을 입력하세요.");
    return;
  }
  if (targetType === "line" && !state.selectedLine) {
    setStatus("라인 코멘트는 라인을 먼저 선택해야 합니다.");
    return;
  }

  await apiFetch("/api/docs/" + doc.id + "/comments/", {
    method: "POST",
    body: {
      author: (els.authorInput.value || "").trim() || "익명",
      text: text,
      targetType: targetType,
      lineNumber: targetType === "line" ? state.selectedLine : null
    }
  });

  els.commentText.value = "";
  await syncDocs();
  setStatus("코멘트를 추가했습니다.");
}

async function handleCommentDelete(event) {
  const button = event.target.closest("[data-comment-id]");
  if (!button) {
    return;
  }

  const doc = getSelectedDoc();
  if (!doc) {
    return;
  }

  const commentId = Number(button.dataset.commentId);
  if (!commentId) {
    return;
  }

  await apiFetch("/api/docs/" + doc.id + "/comments/" + commentId + "/", {
    method: "DELETE"
  });
  await syncDocs();
  setStatus("코멘트를 삭제했습니다.");
}

function handleSummaryCreate() {
  const doc = getSelectedDoc();
  if (!doc) {
    setStatus("요약할 문서가 없습니다.");
    return;
  }

  els.summaryOutput.value = createSummaryText(doc);
  setStatus("요약을 생성했습니다.");
}

function handleSummaryDownload() {
  const doc = getSelectedDoc();
  if (!doc) {
    setStatus("다운로드할 요약이 없습니다.");
    return;
  }
  if (!(els.summaryOutput.value || "").trim()) {
    setStatus("먼저 요약을 생성하세요.");
    return;
  }

  const safeTitle = doc.title.replace(/[\\/:*?"<>|]/g, "_").slice(0, 40) || "summary";
  const fileName = safeTitle + "_review_summary.md";
  const blob = new Blob([els.summaryOutput.value], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
  setStatus("요약 파일을 다운로드했습니다.");
}

function bindEvents() {
  els.fileInput.addEventListener("change", function (event) {
    handleFileUpload(event).catch(function (error) {
      setStatus(error.message);
    });
  });

  els.manualForm.addEventListener("submit", function (event) {
    handleManualSubmit(event).catch(function (error) {
      setStatus(error.message);
    });
  });

  els.docSearch.addEventListener("input", renderDocList);
  els.docList.addEventListener("click", handleDocListClick);
  els.lineView.addEventListener("click", handleLineClick);
  els.markdownPreview.addEventListener("click", handlePreviewClick);

  els.commentList.addEventListener("click", function (event) {
    handleCommentDelete(event).catch(function (error) {
      setStatus(error.message);
    });
  });

  els.deleteDocBtn.addEventListener("click", function () {
    handleDeleteDoc().catch(function (error) {
      setStatus(error.message);
    });
  });

  els.toggleImportantBtn.addEventListener("click", function () {
    handleToggleImportant().catch(function (error) {
      setStatus(error.message);
    });
  });

  els.commentForm.addEventListener("submit", function (event) {
    handleCommentSubmit(event).catch(function (error) {
      setStatus(error.message);
    });
  });

  els.summaryBtn.addEventListener("click", handleSummaryCreate);
  els.downloadSummaryBtn.addEventListener("click", handleSummaryDownload);
}

async function init() {
  bindEvents();
  await syncDocs();
  setInterval(function () {
    syncDocs({ silent: true }).catch(function () {
      // polling failure ignored
    });
  }, 5000);
}

init().catch(function (error) {
  setStatus(error.message);
});
