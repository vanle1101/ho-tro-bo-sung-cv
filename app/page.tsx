"use client";

import { ChangeEvent, DragEvent, FormEvent, useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";

type ChatMessage = {
  role: "assistant" | "user";
  text: string;
};

const stages = [
  ["01", "Đọc & hiểu hồ sơ", "Xác định em là ai, muốn theo vị trí nào và CV đang chứng minh được điều gì."],
  ["02", "Phỏng vấn để hiểu em", "Hỏi sâu từng dữ liệu còn thiếu, không tự suy diễn hoặc điền hộ."],
  ["03", "Khai thác từng project", "Chuyển tên đề tài thành bằng chứng về việc em trực tiếp làm được."],
  ["04", "Kiểm tra định hướng", "Đối chiếu mục tiêu, kiến thức, kỹ năng, project và vị trí ứng tuyển."],
  ["05", "Sửa lần lượt từng mục", "Giải thích bản cũ yếu ở đâu, sửa thế nào và em phải bảo vệ ra sao."],
  ["06", "Đọc lại như doanh nghiệp", "Kiểm tra độ tin cậy, tính nhất quán và lý do doanh nghiệp nên tuyển em."],
];

const proofGroups = [
  ["Đã có bằng chứng", "Hành động, kết quả hoặc sản phẩm trong CV đủ để nhà tuyển dụng tin."],
  ["Tiềm năng bị viết chìm", "Có dữ liệu đáng chú ý nhưng cách viết chưa cho thấy năng lực phía sau."],
  ["Tự nhận, chưa chứng minh", "Kỹ năng được liệt kê nhưng chưa gắn với hành vi hay kết quả cụ thể."],
  ["Khoảng trống thật sự", "Thiếu kiến thức, trải nghiệm hoặc sự nhất quán cần được xử lý thẳng."],
];

const faqs = [
  ["Cô có viết lại toàn bộ CV ngay không?", "Không. Cô chỉ viết lại sau khi đã hiểu em trực tiếp làm gì và có đủ dữ liệu để viết trung thực."],
  ["Project sinh viên có đáng đưa vào CV không?", "Có, nếu project chứng minh được kiến thức, quyết định, công cụ, đầu ra và phần việc riêng của em. Chỉ ghi tên đề tài thì chưa đủ."],
  ["Không có số liệu kết quả thì làm sao?", "Dùng kết quả định tính có thể kiểm chứng: báo cáo, mô hình, dashboard, bộ dữ liệu đã làm sạch, lỗi phát hiện hoặc đánh giá của giảng viên."],
  ["Khi nào cô sẽ hỏi về cách dùng AI?", "Chỉ khi CV hoặc câu trả lời của em có nhắc đến AI, hoặc vị trí ứng tuyển thực sự cần năng lực đó. Đây không phải phần kiểm tra bắt buộc cho mọi hồ sơ."],
];

function Arrow({ direction = "right" }: { direction?: "right" | "down" }) {
  return <span aria-hidden="true">{direction === "right" ? "→" : "↓"}</span>;
}

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [role, setRole] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [answer, setAnswer] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [depth, setDepth] = useState<"quick" | "standard" | "deep">("standard");
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    // Khôi phục mức độ phân tích đã lưu từ lần trước (nếu có).
    try {
      const saved = window.localStorage.getItem("analysisDepth");
      if (saved === "quick" || saved === "standard" || saved === "deep") {
        setDepth(saved);
      }
    } catch {
      // localStorage không khả dụng — giữ mặc định "standard".
    }
  }, []);

  useEffect(() => {
    // Hiệu ứng hiện dần từng khối khi cuộn trang (bỏ qua hero — đã có hiệu ứng load riêng).
    if (typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const blocks = Array.from(
      document.querySelectorAll<HTMLElement>("main > section:not(.hero), main > footer"),
    );
    let observer: IntersectionObserver;
    try {
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              entry.target.classList.add("in-view");
              observer.unobserve(entry.target);
            }
          }
        },
        { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
      );
      blocks.forEach((el) => observer.observe(el));
    } catch {
      // Nếu không tạo được observer, giữ nguyên trang hiển thị bình thường.
      blocks.forEach((el) => el.classList.remove("reveal"));
      return;
    }
    // Chỉ ẩn các khối sau khi observer đã sẵn sàng, tránh trang bị ẩn vĩnh viễn.
    blocks.forEach((el) => el.classList.add("reveal"));
    return () => observer.disconnect();
  }, [submitted]);

  const canStart = file && role.trim().length > 2;
  const fileSize = useMemo(
    () => (file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : ""),
    [file],
  );

  function chooseFile(next?: File) {
    if (!next) return;
    const allowed = /\.pdf$/i.test(next.name);
    if (!allowed) {
      setError("CV phải là file PDF. Nếu CV đang là file Word (.doc/.docx), em hãy mở file rồi chọn Save as / Xuất ra PDF và tải lại nhé.");
      return;
    }
    if (next.size > 10 * 1024 * 1024) {
      setError("CV vượt quá giới hạn 10 MB.");
      return;
    }
    setError("");
    setFile(next);
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    chooseFile(event.target.files?.[0]);
  }

  function onDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDragging(false);
    chooseFile(event.dataTransfer.files?.[0]);
  }

  async function startReview() {
    if (!canStart || !file) return;
    setLoading(true);
    setError("");
    const form = new FormData();
    form.append("cv", file);
    form.append("role", role.trim());
    form.append("depth", depth);
    try {
      const response = await fetch("/api/review", { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Không thể bắt đầu phiên hướng dẫn.");
      setMessages([{ role: "assistant", text: data.text }]);
      setSubmitted(true);
      window.setTimeout(() => {
        document.getElementById("phien-huong-dan")?.scrollIntoView({ behavior: "smooth" });
      }, 60);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Không thể bắt đầu phiên hướng dẫn.");
    } finally {
      setLoading(false);
    }
  }

  async function sendAnswer(event: FormEvent) {
    event.preventDefault();
    const nextAnswer = answer.trim();
    if (!nextAnswer || !file || loading) return;
    const history = messages;
    setMessages((current) => [...current, { role: "user", text: nextAnswer }]);
    setAnswer("");
    setLoading(true);
    setError("");
    try {
      const form = new FormData();
      form.append("cv", file);
      form.append("role", role.trim());
      form.append("depth", depth);
      form.append("answer", nextAnswer);
      form.append("history", JSON.stringify(history));
      const response = await fetch("/api/review", { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Không thể gửi câu trả lời.");
      setMessages((current) => [...current, { role: "assistant", text: data.text }]);
    } catch (nextError) {
      setMessages((current) => current.slice(0, -1));
      setAnswer(nextAnswer);
      setError(nextError instanceof Error ? nextError.message : "Không thể gửi câu trả lời.");
    } finally {
      setLoading(false);
    }
  }

  function resetSession() {
    setSubmitted(false);
    setMessages([]);
    setAnswer("");
    setError("");
  }

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="VanLe personal project — về đầu trang">
          <span className="brand-mark" aria-hidden="true">CV</span>
          <span>VanLe personal project</span>
        </a>
        <nav aria-label="Điều hướng chính">
          <a href="#cach-co-huong-dan">Cách cô hướng dẫn</a>
          <a href="#bang-chung">Bằng chứng năng lực</a>
          <a href="#cau-hoi">Câu hỏi thường gặp</a>
        </nav>
        <a className="nav-cta" href="#gui-ho-so">Gửi hồ sơ</a>
      </header>

      <section className="hero paper" id="top">
        <div className="leaf leaf-one" />
        <div className="hero-copy">
          <p className="eyebrow">GVHD CV · ĐỌC KỸ, HỎI SÂU, SỬA ĐÚNG</p>
          <h1>
            <span className="red-circle">CV</span> không cần nghe hay.<br />
            CV cần chứng minh<br />em làm được gì.
          </h1>
          <p className="hero-lead">
            Cô đọc toàn bộ CV, đối chiếu với vị trí ứng tuyển rồi hỏi đến khi có bằng chứng.
            Sau đó cô sửa từng mục, giải thích rõ lý do và giúp em tự bảo vệ nội dung khi phỏng vấn.
          </p>
          <div className="hero-actions">
            <a className="button button-red" href="#gui-ho-so">Gửi CV để cô đọc <Arrow /></a>
            <a className="text-link" href="#cach-co-huong-dan">Xem cách cô hướng dẫn <Arrow direction="down" /></a>
          </div>
          <p className="hand-note note-proof">bằng chứng?</p>
        </div>

        <div className="intake-card" id="gui-ho-so">
          <div className="card-heading">
            <div>
              <p className="card-kicker">BẮT ĐẦU TỪ DỮ LIỆU THẬT</p>
              <h2>Hồ sơ của em</h2>
            </div>
            <span className="step-badge">Bước 1/2</span>
          </div>

          <label
            className={`dropzone ${isDragging ? "dragging" : ""} ${file ? "has-file" : ""}`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={onDrop}
          >
            <input type="file" accept=".pdf" onChange={onFileChange} />
            <span className="file-icon" aria-hidden="true">{file ? "✓" : "↑"}</span>
            {file ? (
              <>
                <strong>{file.name}</strong>
                <span>{fileSize} · Bấm để chọn file khác</span>
              </>
            ) : (
              <>
                <strong>Thả file CV vào đây</strong>
                <span>PDF · tối đa 10 MB · File Word cần chuyển sang PDF trước khi tải lên</span>
              </>
            )}
          </label>

          <label className="field">
            <span>Vị trí ứng tuyển</span>
            <input
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="Ví dụ: Thực tập sinh Kiểm toán"
            />
          </label>

          <label className="field">
            <span>Mức độ phân tích</span>
            <select
              value={depth}
              onChange={(e) => {
                const next = e.target.value as "quick" | "standard" | "deep";
                setDepth(next);
                try {
                  window.localStorage.setItem("analysisDepth", next);
                } catch {
                  // localStorage không khả dụng — bỏ qua việc lưu.
                }
              }}
            >
              <option value="quick">Nhanh — phản hồi tức thì, phù hợp thử lần đầu</option>
              <option value="standard">Tiêu chuẩn — cân bằng tốc độ và chiều sâu (mặc định)</option>
              <option value="deep">Sâu — hỏi kỹ nhất, phù hợp hồ sơ quan trọng</option>
            </select>
          </label>

          <button className="button button-green start-button" disabled={!canStart || loading} onClick={startReview}>
            {loading ? "Cô đang đọc toàn bộ CV…" : "Bắt đầu đọc hồ sơ"} {!loading && <Arrow />}
          </button>
          {error && <p className="form-error" role="alert">{error}</p>}
          <p className="form-note">Chỉ cần CV và vị trí ứng tuyển. Cô sẽ đọc hồ sơ bằng AI và hỏi tiếp theo từng lượt.</p>
        </div>
      </section>

      <section className="principles">
        <div><span className="line-icon">◇</span><strong>Không bịa thành tích</strong></div>
        <div><span className="line-icon">⌕</span><strong>Hỏi đến khi có bằng chứng</strong></div>
        <div><span className="line-icon">✎</span><strong>Sửa từng mục, không viết hộ</strong></div>
      </section>

      {submitted && (
        <section className="review-session" id="phien-huong-dan" aria-live="polite">
          <div className="session-topbar">
            <div>
              <span className="status-dot" />
              <p>PHIÊN HƯỚNG DẪN ĐANG DIỄN RA</p>
              <h2>{file?.name}</h2>
            </div>
            <div className="session-facts">
              <span>Vị trí <strong>{role}</strong></span>
              <span>Tiến trình <strong>Hỏi đến khi đủ bằng chứng</strong></span>
            </div>
          </div>

          <div className="conversation">
            {messages.map((message, index) => (
              <article className={`message ${message.role}`} key={`${message.role}-${index}`}>
                <span>{message.role === "assistant" ? "Cô" : "Em"}</span>
                <div className="message-content">
                  <ReactMarkdown>{message.text}</ReactMarkdown>
                </div>
              </article>
            ))}
            {loading && (
              <article className="message assistant loading-message">
                <span>Cô</span>
                <div className="message-content">Đang đọc câu trả lời và đối chiếu bằng chứng…</div>
              </article>
            )}
          </div>

          <form className="answer-box" onSubmit={sendAnswer}>
            <label htmlFor="answer">Trả lời câu hỏi của cô</label>
            <textarea
              id="answer"
              value={answer}
              onChange={(event) => setAnswer(event.target.value)}
              placeholder="Nêu rõ em trực tiếp làm gì, dùng dữ liệu/công cụ nào, quyết định gì và tạo ra đầu ra nào…"
              rows={5}
              disabled={loading}
            />
            {error && <p className="form-error" role="alert">{error}</p>}
            <div>
              <button type="button" className="text-link" onClick={resetSession}>Bắt đầu lại</button>
              <button className="button button-red" disabled={!answer.trim() || loading}>
                Gửi câu trả lời <Arrow />
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="method-section" id="cach-co-huong-dan">
        <div className="section-intro">
          <p className="eyebrow">6 GIAI ĐOẠN · KHÔNG ĐI TẮT</p>
          <h2>Không sửa câu chữ<br />khi chưa hiểu năng lực.</h2>
          <p>
            Mỗi giai đoạn chỉ chuyển tiếp khi dữ liệu đã đủ. Nếu câu trả lời còn mơ hồ,
            cô tiếp tục hỏi — không tự điền cho CV nghe chuyên nghiệp hơn.
          </p>
          <div className="margin-note">đừng kể “đã tham gia”<br />hãy chỉ ra “đã làm gì”</div>
        </div>
        <div className="stage-list">
          {stages.map(([number, title, description], index) => (
            <article className={index === 0 ? "active-stage" : ""} key={number}>
              <span className="stage-number">{number}</span>
              <div><h3>{title}</h3><p>{description}</p></div>
              <span className="stage-arrow">↗</span>
            </article>
          ))}
        </div>
      </section>

      <section className="proof-section paper" id="bang-chung">
        <div className="proof-heading">
          <p className="eyebrow">CÔ KHÔNG CHẤM ĐIỂM BẰNG CẢM GIÁC</p>
          <h2>Mọi nhận định đều phải<br />quay về bằng chứng.</h2>
          <p>
            Một công cụ, môn học hay tên project không tự động trở thành kỹ năng.
            Cô phân loại dữ liệu để em biết điều gì nên giữ, điều gì cần đào sâu và điều gì phải bỏ.
          </p>
        </div>
        <div className="proof-grid">
          {proofGroups.map(([title, description], index) => (
            <article key={title}>
              <span>0{index + 1}</span>
              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="project-section">
        <div className="project-card">
          <p className="card-kicker">CÔ SẼ HỎI MỘT PROJECT ĐẾN CÙNG</p>
          <h2>“Em đã trực tiếp làm phần nào?”</h2>
          <div className="question-flow">
            {["Vấn đề", "Vai trò thật", "Hành động", "Quyết định", "Kết quả", "Bài học"].map((item, i) => (
              <div key={item}><span>{i + 1}</span>{item}</div>
            ))}
          </div>
          <p className="quote">
            “Em có tham gia phân tích dữ liệu” chưa phải bằng chứng.
            Cô cần biết em xử lý dữ liệu nào, dùng phương pháp gì, phát hiện điều gì và đầu ra của riêng em là gì.
          </p>
        </div>
      </section>

      <section className="faq-section" id="cau-hoi">
        <div>
          <p className="eyebrow">TRƯỚC KHI BẮT ĐẦU</p>
          <h2>Những điều em<br />cần hiểu rõ.</h2>
          <p className="faq-lead">Mục tiêu không phải làm CV “kêu” hơn. Mục tiêu là để từng dòng trong CV có thể được giải thích và bảo vệ.</p>
        </div>
        <div className="faq-list">
          {faqs.map(([question, answer], index) => (
            <article className={openFaq === index ? "open" : ""} key={question}>
              <button onClick={() => setOpenFaq(openFaq === index ? null : index)}>
                <span>{question}</span><span>{openFaq === index ? "−" : "+"}</span>
              </button>
              {openFaq === index && <p>{answer}</p>}
            </article>
          ))}
        </div>
      </section>

      <section className="final-cta paper">
        <p className="eyebrow">BẮT ĐẦU ĐÚNG THỨ TỰ</p>
        <h2>Gửi hồ sơ. Cô đọc trước,<br />rồi mới hỏi em.</h2>
        <p>Đừng tự sửa thêm cho “hay” trước khi gửi. Cô cần nhìn thấy đúng phiên bản đang khiến em bối rối.</p>
        <a className="button button-red" href="#gui-ho-so">Gửi CV và vị trí <Arrow /></a>
        <span className="hand-note">sửa đúng, không sửa vội</span>
      </section>

      <footer>
        <a className="brand footer-brand" href="#top"><span className="brand-mark">CV</span><span>VanLe personal project</span></a>
        <p>Đọc kỹ · Hỏi sâu · Viết trung thực · Bảo vệ được khi phỏng vấn</p>
        <a href="#top">Về đầu trang ↑</a>
      </footer>
    </main>
  );
}
