if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js");
}

document.addEventListener("DOMContentLoaded", () => {
  renderList();

  document.getElementById("scanBtn").addEventListener("click", processImage);
  document.getElementById("exportBtn").addEventListener("click", exportToTxt);
  document.getElementById("clearBtn").addEventListener("click", clearData);
});

async function processImage() {
  const fileInput = document.getElementById("imageInput");
  const statusDiv = document.getElementById("status");

  if (!fileInput.files[0]) {
    alert("Pilih atau ambil foto struk terlebih dahulu");
    return;
  }

  statusDiv.innerText = "Membaca teks dari gambar...";

  try {
    const worker = await Tesseract.createWorker("ind");
    const result = await worker.recognize(fileInput.files[0]);
    await worker.terminate();

    const parsedData = parseReceipt(result.data.text);
    saveData(parsedData);
    statusDiv.innerText = "Selesai memproses";
  } catch (err) {
    statusDiv.innerText = "Gagal membaca gambar";
    console.error(err);
  }
}

function parseReceipt(text) {
  const noRekPatterns = [
    /(?:rekening\s*tujuan|ke\s*rek(?:ening)?|no\.?\s*rek(?:ening)?\s*tujuan|nomor\s*tujuan|rek\.?\s*tujuan)[\s:=]*([0-9\s-]+)/i,
    /(?:no\.?\s*rek(?:ening)?|account\s*no|no\.?\s*hp)[\s:=]*([0-9\s-]+)/i
  ];

  const namaPatterns = [
    /(?:nama\s*penerima|penerima|ke\s*nama|tujuan\s*transfer|atas\s*nama\s*penerima)[\s:=]*([a-zA-Z\s.]+)/i,
    /(?:nama|atas\s*nama)[\s:=]*([a-zA-Z\s.]+)/i
  ];

  let noRek = "Tidak Terdeteksi";
  for (const pattern of noRekPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const digits = match[1].replace(/\D/g, "");
      if (digits.length >= 8) {
        noRek = digits;
        break;
      }
    }
  }

  let nama = "Tidak Terdeteksi";
  for (const pattern of namaPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const cleaned = match[1].split("\n")[0].replace(/[^a-zA-Z\s.]/g, "").trim();
      if (cleaned.length > 2) {
        nama = cleaned;
        break;
      }
    }
  }

  return { nama, noRek };
}

function saveData(data) {
  let list = JSON.parse(localStorage.getItem("penerima_db") || "[]");
  list.push(data);
  localStorage.setItem("penerima_db", JSON.stringify(list));

  document.getElementById("latestResult").innerHTML = `
    <p><b>Nama:</b> ${data.nama}</p>
    <p><b>No Rekening:</b> ${data.noRek}</p>
  `;

  renderList();
}

function renderList() {
  const list = JSON.parse(localStorage.getItem("penerima_db") || "[]");
  const ul = document.getElementById("dataList");
  ul.innerHTML = "";

  list.forEach((item, index) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <span><b>${item.nama}</b> - ${item.noRek}</span>
      <button class="btn-delete-item" onclick="deleteItem(${index})">X</button>
    `;
    ul.appendChild(li);
  });
}

function deleteItem(index) {
  let list = JSON.parse(localStorage.getItem("penerima_db") || "[]");
  list.splice(index, 1);
  localStorage.setItem("penerima_db", JSON.stringify(list));
  renderList();
}

function clearData() {
  if (confirm("Hapus seluruh data penerima?")) {
    localStorage.removeItem("penerima_db");
    renderList();
    document.getElementById("latestResult").innerText = "Belum ada data dipproses.";
  }
}

function exportToTxt() {
  const list = JSON.parse(localStorage.getItem("penerima_db") || "[]");
  if (list.length === 0) {
    alert("Tidak ada data untuk diekspor");
    return;
  }

  let txtContent = "";
  list.forEach((item) => {
    txtContent += `${item.nama} - ${item.noRek}\n`;
  });

  const blob = new Blob([txtContent], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Daftar_Penerima_${Date.now()}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}