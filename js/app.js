      (() => {
        "use strict";

        // ---------- State ----------
        const state = {
          logoDataUrl: null,
          logoWidth: 0,
          logoHeight: 0,
        };

        const MAX_LOGO_BYTES = 3 * 1024 * 1024; // 3MB
        const MAX_LOGO_DIM = 400; // resize logo to max 400px on the largest side

        // ---------- Utilities ----------
        const $ = (id) => document.getElementById(id);
        const fmt = (n) => {
          const cur = $("currency").value || "";
          const val = (isFinite(n) ? n : 0).toFixed(2);
          return cur + val;
        };
        const todayISO = () => new Date().toISOString().slice(0, 10);
        const escapeHtml = (s) =>
          String(s ?? "").replace(
            /[&<>"']/g,
            (c) =>
              ({
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;",
              })[c],
          );

        // ---------- Init defaults ----------
        $("issueDate").value = todayISO();
        const d = new Date();
        d.setDate(d.getDate() + 30);
        $("expiryDate").value = d.toISOString().slice(0, 10);

        // ---------- Line items ----------
        function addRow(desc = "", qty = 1, price = 0) {
          const tr = document.createElement("tr");
          tr.innerHTML = `
      <td><input type="text" class="li-desc" placeholder="Item or service" value="${escapeHtml(desc)}" /></td>
      <td><input type="number" class="li-qty" min="0" step="any" value="${qty}" /></td>
      <td><input type="number" class="li-price" min="0" step="0.01" value="${price}" /></td>
      <td class="line-total">$0.00</td>
      <td><button type="button" class="remove-row" title="Remove">×</button></td>
    `;
          $("itemsBody").appendChild(tr);
          tr.querySelector(".remove-row").addEventListener("click", () => {
            tr.remove();
            update();
          });
          tr.querySelectorAll("input").forEach((i) =>
            i.addEventListener("input", update),
          );
          update();
        }

        $("addRowBtn").addEventListener("click", () => addRow());
        // Start with one empty row
        addRow();

        // ---------- Totals calculation ----------
        function calcTotals() {
          const rows = [...document.querySelectorAll("#itemsBody tr")];
          let subtotal = 0;
          const items = rows.map((tr) => {
            const desc = tr.querySelector(".li-desc").value.trim();
            const qty = parseFloat(tr.querySelector(".li-qty").value) || 0;
            const price = parseFloat(tr.querySelector(".li-price").value) || 0;
            const total = qty * price;
            tr.querySelector(".line-total").textContent = fmt(total);
            subtotal += total;
            return { desc, qty, price, total };
          });

          const discountVal = parseFloat($("discount").value) || 0;
          const discountType = $("discountType").value;
          const discount =
            discountType === "percent"
              ? subtotal * (discountVal / 100)
              : discountVal;
          const afterDiscount = Math.max(0, subtotal - discount);
          const taxRate = parseFloat($("taxRate").value) || 0;
          const tax = afterDiscount * (taxRate / 100);
          const grand = afterDiscount + tax;

          return { items, subtotal, discount, tax, grand, taxRate };
        }

        // ---------- Update preview & totals ----------
        function update() {
          const t = calcTotals();
          $("sumSubtotal").textContent = fmt(t.subtotal);
          $("sumDiscount").textContent = "-" + fmt(t.discount);
          $("sumTax").textContent = fmt(t.tax);
          $("sumGrand").textContent = fmt(t.grand);
          renderPreview(t);
        }

        // ---------- Preview render ----------
        function renderPreview(t) {
          const docType = document.querySelector(
            'input[name="docType"]:checked',
          ).value;
          const logoPos = $("logoPos").value;
          const logoHtml = state.logoDataUrl
            ? `<div class="pd-logo"><img src="${state.logoDataUrl}" alt="Logo"/></div>`
            : "";
          const businessName = $("bizName").value.trim();
          const businessLines = [
            $("bizAddress").value,
            $("bizEmail").value,
            $("bizPhone").value,
            $("bizWebsite").value,
          ]
            .filter(Boolean)
            .map(escapeHtml)
            .join("<br/>");

          const clientName = $("clientName").value.trim();
          const clientBiz = $("clientBiz").value.trim();
          const clientAddr = $("clientAddress").value.trim();
          const clientEmail = $("clientEmail").value.trim();

          const rowsHtml =
            t.items
              .filter((i) => i.desc || i.qty || i.price)
              .map(
                (i) => `
      <tr>
        <td>${escapeHtml(i.desc)}</td>
        <td class="num">${i.qty}</td>
        <td class="num">${fmt(i.price)}</td>
        <td class="num">${fmt(i.total)}</td>
      </tr>
    `,
              )
              .join("") ||
            `<tr><td colspan="4" style="text-align:center;color:#9ca3af;padding:1rem;">No line items yet</td></tr>`;

          const notes = $("notes").value.trim();

          $("preview").innerHTML = `
      <div class="pd-header ${logoPos === "right" ? "right-logo" : ""}">
        ${logoHtml || `<div class="pd-business"><strong>${escapeHtml(businessName) || "Your Company"}</strong>${businessLines ? "<br/>" + businessLines : ""}</div>`}
        <div style="text-align:right;">
          <h3>${escapeHtml(docType).toUpperCase()}</h3>
          <div class="pd-meta" style="margin-top:0.5rem; text-align:left;">
            <div><span>Number:</span><strong>${escapeHtml($("docNumber").value)}</strong></div>
            <div><span>Issued:</span><strong>${escapeHtml($("issueDate").value)}</strong></div>
            <div><span>Valid until:</span><strong>${escapeHtml($("expiryDate").value)}</strong></div>
          </div>
        </div>
      </div>

      ${state.logoDataUrl && businessName ? `<div class="pd-business" style="margin-bottom:1rem;"><strong>${escapeHtml(businessName)}</strong>${businessLines ? "<br/>" + businessLines : ""}</div>` : ""}

      <div class="pd-client">
        <div class="label">Bill to</div>
        ${clientBiz ? `<strong>${escapeHtml(clientBiz)}</strong><br/>` : ""}
        ${clientName ? escapeHtml(clientName) + "<br/>" : ""}
        ${clientAddr ? escapeHtml(clientAddr).replace(/\n/g, "<br/>") + "<br/>" : ""}
        ${clientEmail ? escapeHtml(clientEmail) : ""}
      </div>

      ${$("projectTitle").value ? `<div style="margin-bottom:0.5rem;"><strong>Project:</strong> ${escapeHtml($("projectTitle").value)}</div>` : ""}

      <table>
        <thead>
          <tr><th>Description</th><th style="text-align:right;">Qty</th><th style="text-align:right;">Unit price</th><th style="text-align:right;">Total</th></tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
      </table>

      <div class="pd-totals">
        <div><span>Subtotal</span><span>${fmt(t.subtotal)}</span></div>
        ${t.discount > 0 ? `<div><span>Discount</span><span>-${fmt(t.discount)}</span></div>` : ""}
        ${t.taxRate > 0 ? `<div><span>Tax (${t.taxRate}%)</span><span>${fmt(t.tax)}</span></div>` : ""}
        <div class="grand"><span>Total</span><span>${fmt(t.grand)}</span></div>
      </div>

      ${notes ? `<div class="pd-notes"><div class="label">Notes / Terms</div>${escapeHtml(notes)}</div>` : ""}
    `;
        }

        // ---------- Bind live update to all relevant inputs ----------
        const liveInputs = [
          "bizName",
          "bizEmail",
          "bizPhone",
          "bizWebsite",
          "bizAddress",
          "clientName",
          "clientBiz",
          "clientEmail",
          "clientAddress",
          "docNumber",
          "issueDate",
          "expiryDate",
          "projectTitle",
          "notes",
          "discount",
          "discountType",
          "taxRate",
          "currency",
          "logoPos",
        ];
        liveInputs.forEach((id) => $(id).addEventListener("input", update));
        document
          .querySelectorAll('input[name="docType"]')
          .forEach((r) => r.addEventListener("change", update));

        // ---------- Logo upload (with size validation + canvas resize) ----------
        $("logoFile").addEventListener("change", (e) => {
          const file = e.target.files[0];
          const errEl = $("logoError");
          errEl.style.display = "none";
          if (!file) return;

          if (!file.type.startsWith("image/")) {
            errEl.textContent = "Please select a valid image file.";
            errEl.style.display = "block";
            e.target.value = "";
            return;
          }
          if (file.size > MAX_LOGO_BYTES) {
            errEl.textContent = `Logo is too large (${(file.size / 1024 / 1024).toFixed(2)}MB). Maximum 3MB.`;
            errEl.style.display = "block";
            e.target.value = "";
            return;
          }

          const reader = new FileReader();
          reader.onload = (ev) => {
            const img = new Image();
            img.onload = () => {
              // Resize via canvas, maintaining aspect ratio
              let { width, height } = img;
              const ratio = Math.min(
                MAX_LOGO_DIM / width,
                MAX_LOGO_DIM / height,
                1,
              );
              width = Math.round(width * ratio);
              height = Math.round(height * ratio);
              const canvas = document.createElement("canvas");
              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext("2d");
              ctx.drawImage(img, 0, 0, width, height);
              // Use PNG to preserve transparency for logos
              state.logoDataUrl = canvas.toDataURL("image/png");
              state.logoWidth = width;
              state.logoHeight = height;
              $("logoPreviewImg").src = state.logoDataUrl;
              $("logoPreview").style.display = "flex";
              update();
            };
            img.onerror = () => {
              errEl.textContent = "Could not read this image file.";
              errEl.style.display = "block";
            };
            img.src = ev.target.result;
          };
          reader.readAsDataURL(file);
        });

        $("logoRemove").addEventListener("click", () => {
          state.logoDataUrl = null;
          state.logoWidth = 0;
          state.logoHeight = 0;
          $("logoFile").value = "";
          $("logoPreview").style.display = "none";
          update();
        });

        // ---------- Validation ----------
        function validate() {
          const errors = [];
          const docType = document.querySelector(
            'input[name="docType"]:checked',
          );
          if (!docType)
            errors.push("Select a document type (Estimate or Quote).");
          if (!$("bizName").value.trim() && !state.logoDataUrl) {
            errors.push("Add a company name or upload a logo.");
          }
          if (!$("clientName").value.trim() && !$("clientBiz").value.trim()) {
            errors.push("Add a client name or client business name.");
          }
          const t = calcTotals();
          const validItems = t.items.filter((i) => i.desc && i.qty > 0);
          if (validItems.length === 0) {
            errors.push(
              "Add at least one line item with a description and quantity.",
            );
          }
          return errors;
        }

        // ---------- PDF generation ----------
        $("downloadBtn").addEventListener("click", () => {
          const errEl = $("validationError");
          const errors = validate();
          if (errors.length) {
            errEl.innerHTML =
              "<strong>Please fix the following:</strong><ul>" +
              errors.map((e) => `<li>${escapeHtml(e)}</li>`).join("") +
              "</ul>";
            errEl.style.display = "block";
            errEl.scrollIntoView({ behavior: "smooth", block: "center" });
            return;
          }
          errEl.style.display = "none";
          generatePDF();
        });

        function generatePDF() {
          const { jsPDF } = window.jspdf;
          const doc = new jsPDF({ unit: "pt", format: "a4" });
          const pageW = doc.internal.pageSize.getWidth();
          const pageH = doc.internal.pageSize.getHeight();
          const margin = 50; // larger page margin
          // Spacing tokens — single source of truth so the PDF "breathes"
          const SP = {
            section: 28, // gap between major sections
            block: 14, // gap between sub-blocks
            line: 14, // body line height
            lineSm: 12, // small line height
            rowPadV: 10, // vertical padding inside table rows
          };
          let y = margin;

          const docType = document.querySelector(
            'input[name="docType"]:checked',
          ).value;
          const logoPos = $("logoPos").value;
          const businessName = $("bizName").value.trim();
          const t = calcTotals();

          // ----- Header: logo + doc title -----
          let logoBottom = y;

          if (state.logoDataUrl) {
            const maxW = 130,
              maxH = 65;
            const ratio = Math.min(
              maxW / state.logoWidth,
              maxH / state.logoHeight,
            );
            const w = state.logoWidth * ratio;
            const h = state.logoHeight * ratio;
            const x = logoPos === "right" ? pageW - margin - w : margin;
            try {
              doc.addImage(state.logoDataUrl, "PNG", x, y, w, h);
              logoBottom = y + h;
            } catch (err) {
              console.warn("Logo render failed:", err);
            }
          }

          // Doc type heading (opposite side of logo, or right if no logo)
          doc.setFont("helvetica", "bold");
          doc.setFontSize(24);
          doc.setTextColor(17, 24, 39);
          const titleText = docType.toUpperCase();
          const titleX =
            logoPos === "right" && state.logoDataUrl ? margin : pageW - margin;
          const titleAlign =
            logoPos === "right" && state.logoDataUrl ? "left" : "right";
          doc.text(titleText, titleX, y + 22, { align: titleAlign });

          // Doc meta lines under title
          doc.setFont("helvetica", "normal");
          doc.setFontSize(10);
          doc.setTextColor(75, 85, 99);
          const metaLines = [
            `Number: ${$("docNumber").value}`,
            `Issued: ${$("issueDate").value}`,
            `Valid until: ${$("expiryDate").value}`,
          ];
          metaLines.forEach((l, i) => {
            doc.text(l, titleX, y + 44 + i * 14, { align: titleAlign });
          });

          // Drop below whichever side is taller, then leave a generous gap
          y = Math.max(logoBottom, y + 90) + SP.section;

          // ----- Business details -----
          if (
            businessName ||
            $("bizAddress").value ||
            $("bizEmail").value ||
            $("bizPhone").value ||
            $("bizWebsite").value
          ) {
            doc.setFont("helvetica", "bold");
            doc.setFontSize(12);
            doc.setTextColor(17, 24, 39);
            if (businessName) {
              doc.text(businessName, margin, y);
              y += SP.line + 2;
            }
            doc.setFont("helvetica", "normal");
            doc.setFontSize(10);
            doc.setTextColor(75, 85, 99);
            const bizLines = [
              $("bizAddress").value,
              $("bizEmail").value,
              $("bizPhone").value,
              $("bizWebsite").value,
            ].filter(Boolean);
            bizLines.forEach((line) => {
              line.split("\n").forEach((seg) => {
                doc.text(seg, margin, y);
                y += SP.line;
              });
            });
            y += SP.section;
          }

          // ----- Client / Bill To -----
          doc.setFont("helvetica", "bold");
          doc.setFontSize(9);
          doc.setTextColor(107, 114, 128);
          doc.text("BILL TO", margin, y);
          y += SP.line + 2;
          doc.setFontSize(11);
          doc.setTextColor(17, 24, 39);
          if ($("clientBiz").value.trim()) {
            doc.text($("clientBiz").value.trim(), margin, y);
            y += SP.line + 1;
          }
          doc.setFont("helvetica", "normal");
          doc.setFontSize(10);
          if ($("clientName").value.trim()) {
            doc.text($("clientName").value.trim(), margin, y);
            y += SP.line;
          }
          if ($("clientAddress").value.trim()) {
            $("clientAddress")
              .value.trim()
              .split("\n")
              .forEach((line) => {
                doc.text(line, margin, y);
                y += SP.line;
              });
          }
          if ($("clientEmail").value.trim()) {
            doc.text($("clientEmail").value.trim(), margin, y);
            y += SP.line;
          }
          y += SP.section;

          // ----- Project title -----
          if ($("projectTitle").value.trim()) {
            doc.setFont("helvetica", "bold");
            doc.setFontSize(11);
            doc.text(`Project:`, margin, y);
            doc.setFont("helvetica", "normal");
            doc.text($("projectTitle").value.trim(), margin + 55, y);
            y += SP.section;
          }

          // ----- Line items table -----
          const colX = {
            desc: margin,
            qty: pageW - margin - 270,
            price: pageW - margin - 180,
            total: pageW - margin,
          };
          const colW = {
            desc: colX.qty - colX.desc - 14,
          };

          // Header row (taller, more breathing room)
          const headerH = 24;
          doc.setFillColor(243, 244, 246);
          doc.rect(margin, y, pageW - margin * 2, headerH, "F");
          doc.setFont("helvetica", "bold");
          doc.setFontSize(9);
          doc.setTextColor(107, 114, 128);
          const headerTextY = y + 16;
          doc.text("DESCRIPTION", colX.desc + 6, headerTextY);
          doc.text("QTY", colX.qty, headerTextY, { align: "right" });
          doc.text("UNIT PRICE", colX.price, headerTextY, { align: "right" });
          doc.text("TOTAL", colX.total - 6, headerTextY, { align: "right" });
          y += headerH;

          doc.setFont("helvetica", "normal");
          doc.setFontSize(10);
          doc.setTextColor(17, 24, 39);

          const validItems = t.items.filter((i) => i.desc && i.qty > 0);
          validItems.forEach((item) => {
            const descLines = doc.splitTextToSize(item.desc, colW.desc);
            const rowH = Math.max(
              26,
              descLines.length * SP.line + SP.rowPadV * 2,
            );

            // Page break if needed (leave room for totals block)
            if (y + rowH > pageH - margin - 140) {
              doc.addPage();
              y = margin;
            }

            const textY = y + SP.rowPadV + 4;
            doc.text(descLines, colX.desc + 6, textY);
            doc.text(String(item.qty), colX.qty, textY, { align: "right" });
            doc.text(fmt(item.price), colX.price, textY, { align: "right" });
            doc.text(fmt(item.total), colX.total - 6, textY, {
              align: "right",
            });
            y += rowH;
            // Row divider
            doc.setDrawColor(229, 231, 235);
            doc.line(margin, y, pageW - margin, y);
          });

          y += SP.section;

          // ----- Totals -----
          const totalsX = pageW - margin - 200;
          const totalsValueX = pageW - margin;

          const drawTotalRow = (label, value, bold = false) => {
            if (y > pageH - margin - 50) {
              doc.addPage();
              y = margin;
            }
            doc.setFont("helvetica", bold ? "bold" : "normal");
            doc.setFontSize(bold ? 12 : 10);
            doc.setTextColor(17, 24, 39);
            doc.text(label, totalsX, y);
            doc.text(value, totalsValueX, y, { align: "right" });
            y += bold ? 20 : 16;
          };

          drawTotalRow("Subtotal", fmt(t.subtotal));
          if (t.discount > 0) drawTotalRow("Discount", "-" + fmt(t.discount));
          if (t.taxRate > 0) drawTotalRow(`Tax (${t.taxRate}%)`, fmt(t.tax));

          y += 4;
          doc.setDrawColor(17, 24, 39);
          doc.setLineWidth(1);
          doc.line(totalsX, y - 4, totalsValueX, y - 4);
          y += 8;
          drawTotalRow("TOTAL", fmt(t.grand), true);
          doc.setLineWidth(0.2);

          // ----- Notes -----
          const notesVal = $("notes").value.trim();
          if (notesVal) {
            y += SP.section;
            if (y > pageH - margin - 80) {
              doc.addPage();
              y = margin;
            }
            doc.setDrawColor(229, 231, 235);
            doc.line(margin, y, pageW - margin, y);
            y += SP.section - 6;
            doc.setFont("helvetica", "bold");
            doc.setFontSize(9);
            doc.setTextColor(107, 114, 128);
            doc.text("NOTES / TERMS", margin, y);
            y += SP.line + 4;
            doc.setFont("helvetica", "normal");
            doc.setFontSize(10);
            doc.setTextColor(55, 65, 81);
            const noteLines = doc.splitTextToSize(notesVal, pageW - margin * 2);
            noteLines.forEach((line) => {
              if (y > pageH - margin) {
                doc.addPage();
                y = margin;
              }
              doc.text(line, margin, y);
              y += SP.line;
            });
          }

          // ----- Filename -----
          const num = ($("docNumber").value || "001").replace(
            /[^a-zA-Z0-9\-_]/g,
            "",
          );
          const filename = `${docType.toLowerCase()}-${num}.pdf`;
          doc.save(filename);
        }

        // ---------- Reset ----------
        $("resetBtn").addEventListener("click", () => {
          if (!confirm("Reset the entire form? This cannot be undone.")) return;
          // Clear text inputs
          document
            .querySelectorAll(
              'input[type="text"], input[type="email"], input[type="tel"], input[type="url"], textarea',
            )
            .forEach((i) => {
              i.value = "";
            });
          $("docNumber").value = "001";
          $("currency").value = "$";
          $("discount").value = "0";
          $("taxRate").value = "0";
          $("discountType").value = "amount";
          $("logoPos").value = "left";
          $("issueDate").value = todayISO();
          const dd = new Date();
          dd.setDate(dd.getDate() + 30);
          $("expiryDate").value = dd.toISOString().slice(0, 10);
          document.querySelector(
            'input[name="docType"][value="Estimate"]',
          ).checked = true;
          // Logo
          state.logoDataUrl = null;
          $("logoFile").value = "";
          $("logoPreview").style.display = "none";
          $("logoError").style.display = "none";
          $("validationError").style.display = "none";
          // Items
          $("itemsBody").innerHTML = "";
          addRow();
        });

        // First render
        update();
      })();
