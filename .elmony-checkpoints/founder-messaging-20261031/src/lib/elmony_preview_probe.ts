type PreviewUiProbeExpectations = {
  paymentDialog: boolean;
  fileUpload: boolean;
  blogContent: boolean;
  dashboardShell: boolean;
  crudTable: boolean;
  interactionAudit?: boolean;
};

type PreviewInteractionFinding = {
  id: string;
  severity: "error" | "warning";
  label: string;
  message: string;
  evidence?: string;
};

type PreviewUiProbeRequest = {
  requestId: string;
  appId: number;
  workflowId: string | null;
  prompt: string;
  expectations: PreviewUiProbeExpectations;
};

type PreviewUiProbeResult = {
  requestId: string;
  appId: number;
  route: string;
  clickedTrigger: boolean;
  headings: string[];
  buttons: string[];
  hasDialog: boolean;
  hasPaymentForm: boolean;
  hasStripeFrame: boolean;
  hasAlert: boolean;
  hasBackHome: boolean;
  hasFileInput: boolean;
  hasProgress: boolean;
  hasDropzone: boolean;
  hasArticleContent: boolean;
  hasTable: boolean;
  hasCardLikeContent: boolean;
  interactiveCount?: number;
  interactionFindings?: PreviewInteractionFinding[];
};

function normalizeText(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function isVisible(element: Element | null): boolean {
  if (!(element instanceof HTMLElement)) {
    return false;
  }

  const style = window.getComputedStyle(element);
  if (
    style.display === "none" ||
    style.visibility === "hidden" ||
    Number(style.opacity) === 0
  ) {
    return false;
  }

  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function collectVisibleTexts(selector: string, limit = 8): string[] {
  const values = Array.from(document.querySelectorAll(selector))
    .filter((element) => isVisible(element))
    .map((element) => normalizeText(element.textContent))
    .filter(Boolean);

  return Array.from(new Set(values)).slice(0, limit);
}

function hasAnyVisibleSelector(selector: string): boolean {
  return Array.from(document.querySelectorAll(selector)).some((element) =>
    isVisible(element),
  );
}

function findLikelyTrigger(): HTMLElement | null {
  const triggerPattern =
    /(get started|pay|checkout|subscribe|unlock|upgrade|buy|upload|select file|choose file|add file)/i;
  const candidates = Array.from(
    document.querySelectorAll("button, a, [role='button']"),
  ).filter((element) => isVisible(element));

  for (const candidate of candidates) {
    const text = normalizeText(candidate.textContent);
    if (triggerPattern.test(text) && candidate instanceof HTMLElement) {
      return candidate;
    }
  }

  return null;
}

function getInteractionLabel(element: HTMLElement, index: number): string {
  return (
    normalizeText(element.getAttribute("aria-label")) ||
    normalizeText(element.textContent) ||
    normalizeText(element.getAttribute("title")) ||
    `${element.tagName.toLowerCase()} ${index + 1}`
  );
}

function auditVisibleInteractions(): {
  interactiveCount: number;
  findings: PreviewInteractionFinding[];
} {
  const candidates = Array.from(
    document.querySelectorAll<HTMLElement>(
      "button, a[href], input, select, textarea, [role='button'], [role='link'], [role='tab']",
    ),
  ).filter((element) => isVisible(element));
  const findings: PreviewInteractionFinding[] = [];

  candidates.forEach((element, index) => {
    const label = getInteractionLabel(element, index);
    const hasAccessibleName = Boolean(
      normalizeText(element.getAttribute("aria-label")) ||
        normalizeText(element.textContent) ||
        normalizeText(element.getAttribute("title")) ||
        (element instanceof HTMLInputElement && normalizeText(element.value)),
    );
    if (!hasAccessibleName) {
      findings.push({
        id: "interactive-control-missing-label",
        severity: "warning",
        label,
        message:
          "Visible interactive control has no text, aria-label, title, or input value.",
        evidence: element.outerHTML.slice(0, 400),
      });
    }

    if (
      element.matches(":disabled, [aria-disabled='true']") ||
      window.getComputedStyle(element).pointerEvents === "none"
    ) {
      return;
    }

    const rect = element.getBoundingClientRect();
    const x = Math.min(
      window.innerWidth - 1,
      Math.max(0, rect.left + rect.width / 2),
    );
    const y = Math.min(
      window.innerHeight - 1,
      Math.max(0, rect.top + rect.height / 2),
    );
    const hit = document.elementFromPoint(x, y);
    if (hit && hit !== element && !element.contains(hit)) {
      findings.push({
        id: "interactive-control-blocked",
        severity: "error",
        label,
        message:
          "The center of this control is covered by another element, so clicks may not reach it.",
        evidence: `control=${element.outerHTML.slice(0, 240)}\ncovering=${hit.outerHTML.slice(0, 240)}`,
      });
    }
  });

  return {
    interactiveCount: candidates.length,
    findings: findings.slice(0, 30),
  };
}

function inspectCurrentDom(params: {
  requestId: string;
  appId: number;
  clickedTrigger: boolean;
  interactionAudit: boolean;
}): PreviewUiProbeResult {
  const headings = collectVisibleTexts("h1, h2, h3");
  const buttons = collectVisibleTexts("button, a, [role='button']");
  const bodyText = normalizeText(document.body?.textContent);
  const interactionAudit = params.interactionAudit
    ? auditVisibleInteractions()
    : { interactiveCount: 0, findings: [] };

  return {
    requestId: params.requestId,
    appId: params.appId,
    route: `${window.location.pathname}${window.location.search}`,
    clickedTrigger: params.clickedTrigger,
    headings,
    buttons,
    hasDialog: hasAnyVisibleSelector(
      "[role='dialog'], [data-state='open'], [data-radix-dialog-content]",
    ),
    hasPaymentForm:
      hasAnyVisibleSelector("form") &&
      /(pay now|card|payment|checkout)/i.test(bodyText),
    hasStripeFrame: hasAnyVisibleSelector(
      "iframe[src*='stripe'], iframe[name*='__privateStripeFrame']",
    ),
    hasAlert: hasAnyVisibleSelector("[role='alert'], [data-slot='alert']"),
    hasBackHome: buttons.some((text) => /(back|home|retry|again)/i.test(text)),
    hasFileInput: hasAnyVisibleSelector("input[type='file']"),
    hasProgress: hasAnyVisibleSelector("progress, [role='progressbar']"),
    hasDropzone:
      /drag|drop|upload/.test(bodyText.toLowerCase()) &&
      hasAnyVisibleSelector("section, div, form"),
    hasArticleContent:
      hasAnyVisibleSelector("article") ||
      headings.length >= 2 ||
      /read more|published|author|article|blog/.test(bodyText.toLowerCase()),
    hasTable: hasAnyVisibleSelector("table, [role='table']"),
    hasCardLikeContent:
      hasAnyVisibleSelector("[data-slot='card'], article") ||
      document.querySelectorAll("section, article").length >= 2,
    interactiveCount: interactionAudit.interactiveCount,
    interactionFindings: interactionAudit.findings,
  };
}

async function runPreviewUiProbe(
  payload: PreviewUiProbeRequest,
): Promise<void> {
  let clickedTrigger = false;

  if (payload.expectations.paymentDialog) {
    const trigger = findLikelyTrigger();
    if (trigger) {
      trigger.click();
      clickedTrigger = true;
      await new Promise((resolve) => window.setTimeout(resolve, 500));
    }
  }

  const result = inspectCurrentDom({
    requestId: payload.requestId,
    appId: payload.appId,
    clickedTrigger,
    interactionAudit: Boolean(payload.expectations.interactionAudit),
  });

  window.parent.postMessage(
    {
      type: "elmony-ui-probe-result",
      payload: result,
    },
    "*",
  );
}

if (typeof window !== "undefined") {
  window.addEventListener("message", (event: MessageEvent) => {
    if (event.data?.type !== "elmony-run-ui-probe") {
      return;
    }

    const payload = event.data.payload as PreviewUiProbeRequest | undefined;
    if (!payload?.requestId) {
      return;
    }

    runPreviewUiProbe(payload).catch((error) => {
      const fallback = inspectCurrentDom({
        requestId: payload.requestId,
        appId: payload.appId,
        clickedTrigger: false,
        interactionAudit: Boolean(payload.expectations.interactionAudit),
      });
      window.parent.postMessage(
        {
          type: "elmony-ui-probe-result",
          payload: fallback,
          error: error instanceof Error ? error.message : String(error),
        },
        "*",
      );
    });
  });
}

export {};
