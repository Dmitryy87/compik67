import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import { Build, createOrder, getBuilds } from "./api/client";

type IconName = "arrow" | "check" | "chevron" | "cpu" | "menu" | "shield" | "spark" | "x" | "zap";

function Icon({ name, className = "size-5" }: { name: IconName; className?: string }) {
  const paths: Record<IconName, ReactNode> = {
    arrow: <><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    chevron: <path d="m9 18 6-6-6-6" />,
    cpu: <><rect x="6" y="6" width="12" height="12" rx="2" /><path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 14h3M1 9h3M1 14h3M9 9h6v6H9z" /></>,
    menu: <path d="M4 7h16M4 12h16M4 17h16" />,
    shield: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /><path d="m9 12 2 2 4-4" /></>,
    spark: <path d="m12 3-1.3 4.2a5 5 0 0 1-3.4 3.4L3 12l4.3 1.4a5 5 0 0 1 3.4 3.4L12 21l1.3-4.2a5 5 0 0 1 3.4-3.4L21 12l-4.3-1.4a5 5 0 0 1-3.4-3.4L12 3Z" />,
    x: <path d="m6 6 12 12M18 6 6 18" />
    zap: <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" />,
  };

  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

const configOptions = {
  purpose: [
    { label: "Игры", value: "games", price: 0 },
    { label: "Работа", value: "work", price: 12000 },
    { label: "Стриминг", value: "stream", price: 24000 },
  ],
  performance: [
    { label: "Full HD", value: "fhd", price: 0 },
    { label: "2K / 144 Гц", value: "2k", price: 58000 },
    { label: "4K / Ultra", value: "4k", price: 132000 },
  ],
};

const formatPrice = (value: number | string) => `${Number(value).toLocaleString("ru-RU")} ₽`;

function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [purpose, setPurpose] = useState("games");
  const [performance, setPerformance] = useState("2k");
  const [builds, setBuilds] = useState<Build[]>([]);
  const [buildsError, setBuildsError] = useState(false);
  const [selectedBuild, setSelectedBuild] = useState<Build | null>(null);
  const [useConfigurator, setUseConfigurator] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<number | null>(null);

  useEffect(() => {
    getBuilds()
      .then(setBuilds)
      .catch(() => setBuildsError(true));
  }, []);

  const total = useMemo(() => {
    const purposePrice = configOptions.purpose.find((item) => item.value === purpose)?.price ?? 0;
    const performancePrice = configOptions.performance.find((item) => item.value === performance)?.price ?? 0;
    return 91900 + purposePrice + performancePrice;
  }, [purpose, performance]);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setMenuOpen(false);
  };

  const chooseBuild = (build: Build) => {
    setSelectedBuild(build);
    setUseConfigurator(false);
    scrollTo("request");
  };

  const chooseConfig = () => {
    setSelectedBuild(null);
    setUseConfigurator(true);
    scrollTo("request");
  };

  const submitForm = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSubmitting(true);
    setSubmitError(null);
    try {
      const order = await createOrder({
        name: String(form.get("name") ?? "").trim(),
        phone: String(form.get("phone") ?? "").trim(),
        message: String(form.get("message") ?? "").trim() || undefined,
        build_id: selectedBuild?.id ?? null,
        purpose: useConfigurator ? purpose : undefined,
        performance: useConfigurator ? performance : undefined,
        estimated_price: selectedBuild ? Number(selectedBuild.price) : useConfigurator ? total : undefined,
      });
      setOrderId(order.id);
    } catch {
      setSubmitError("Не удалось отправить заявку. Проверьте данные и попробуйте ещё раз.");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setOrderId(null);
    setSelectedBuild(null);
    setUseConfigurator(false);
  };

  return (
    <div className="min-h-screen overflow-hidden bg-[#f4f4ef] text-[#141510]">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#141510]/90 text-white backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 lg:px-8">
          <button onClick={() => scrollTo("top")} className="flex items-center gap-3" aria-label="На главную">
            <span className="grid size-9 place-items-center rounded-xl bg-[#dfff4f] text-[#141510]"><Icon name="cpu" className="size-5" /></span>
            <span className="text-lg font-extrabold tracking-[-0.04em]">KOMPIK67<span className="text-[#dfff4f]">.</span></span>
          </button>
          <nav className="hidden items-center gap-8 text-sm text-white/70 md:flex">
            <button className="transition hover:text-white" onClick={() => scrollTo("builds")}>Сборки</button>
            <button className="transition hover:text-white" onClick={() => scrollTo("configurator")}>Конфигуратор</button>
            <button className="transition hover:text-white" onClick={() => scrollTo("process")}>Как мы работаем</button>
          </nav>
          <button onClick={() => scrollTo("request")} className="hidden rounded-full bg-white px-5 py-3 text-sm font-bold text-[#141510] transition hover:bg-[#dfff4f] md:block">
            Обсудить сборку
          </button>
          <button className="grid size-11 place-items-center rounded-full border border-white/15 md:hidden" onClick={() => setMenuOpen(!menuOpen)} aria-label="Открыть меню">
            <Icon name={menuOpen ? "x" : "menu"} />
          </button>
        </div>
        {menuOpen && (
          <nav className="border-t border-white/10 px-5 py-5 text-lg md:hidden">
            {["builds", "configurator", "process", "request"].map((id, index) => (
              <button key={id} onClick={() => scrollTo(id)} className="block w-full border-b border-white/10 py-4 text-left">
                {["Сборки", "Конфигуратор", "Как мы работаем", "Оставить заявку"][index]}
              </button>
            ))}
          </nav>
        )}
      </header>

      <main id="top">
        <section className="relative min-h-[760px] bg-[#141510] pt-20 text-white">
          <div className="mx-auto grid min-h-[680px] max-w-7xl items-center gap-12 px-5 py-16 lg:grid-cols-[1.05fr_.95fr] lg:px-8 lg:py-20">
            <div className="relative z-10">
              <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-white/70">
                <span className="size-2 rounded-full bg-[#dfff4f] shadow-[0_0_16px_#dfff4f]" />
                Собираем в Москве · Доставляем по РФ
              </div>
              <h1 className="max-w-3xl text-[clamp(3.4rem,7.2vw,7.3rem)] font-extrabold leading-[0.87] tracking-[-0.075em]">
                Твой ПК.<br /><span className="text-[#dfff4f]">Твои правила.</span>
              </h1>
              <p className="mt-8 max-w-xl text-lg leading-relaxed text-white/60 md:text-xl">
                Подберём комплектующие под ваши задачи, соберём, протестируем и доставим готовый компьютер.
              </p>
              <div className="mt-10 flex flex-col gap-3 sm:flex-row">
                <button onClick={() => scrollTo("configurator")} className="group inline-flex items-center justify-center gap-3 rounded-full bg-[#dfff4f] px-7 py-4 font-bold text-[#141510] transition hover:scale-[1.02]">
                  Собрать свой ПК <Icon name="arrow" className="size-5 transition group-hover:translate-x-1" />
                </button>
                <button onClick={() => scrollTo("builds")} className="rounded-full border border-white/20 px-7 py-4 font-bold transition hover:bg-white/10">
                  Смотреть готовые
                </button>
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-xl">
              <div className="absolute -inset-8 rounded-full bg-[#dfff4f]/15 blur-3xl" />
              <div className="relative aspect-[4/5] overflow-hidden rounded-[2.5rem] bg-[#292a26]">
                <img
                  className="h-full w-full object-cover opacity-90"
                  src="https://images.unsplash.com/photo-1738245494097-9b1e3971c3eb?auto=format&fit=crop&w=1200&q=85"
                  alt="Современный игровой компьютер в корпусе с прозрачной панелью"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                <div className="absolute inset-x-6 bottom-6 flex items-end justify-between rounded-3xl border border-white/15 bg-black/35 p-5 backdrop-blur-xl">
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-white/50">Средний срок сборки</p>
                    <p className="mt-1 text-2xl font-bold">3–5 дней</p>
                  </div>
                  <span className="grid size-12 place-items-center rounded-2xl bg-[#dfff4f] text-[#141510]"><Icon name="zap" /></span>
                </div>
              </div>
            </div>
          </div>
          <div className="border-t border-white/10">
            <div className="mx-auto grid max-w-7xl grid-cols-2 divide-x divide-white/10 px-5 lg:grid-cols-4 lg:px-8">
              {[["500+", "собранных ПК"], ["24 ч", "стресс-тест"], ["3 года", "гарантии"], ["4.9", "оценка клиентов"]].map(([value, label]) => (
                <div key={label} className="py-7 text-center">
                  <p className="text-2xl font-extrabold">{value}</p>
                  <p className="mt-1 text-xs text-white/45">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="builds" className="mx-auto max-w-7xl px-5 py-24 lg:px-8 lg:py-32">
          <div className="flex flex-col items-start justify-between gap-5 md:flex-row md:items-end">
            <div>
              <p className="section-label">Готовые решения</p>
              <h2 className="mt-4 text-4xl font-extrabold tracking-[-0.05em] md:text-6xl">Выберите свой уровень</h2>
            </div>
            <p className="max-w-sm text-base leading-relaxed text-[#686961]">Каждую сборку можно изменить под себя. Мы проверили совместимость и температурный режим.</p>
          </div>
          {buildsError && <p className="mt-10 rounded-2xl bg-red-100 p-5 text-sm text-red-800">Не удалось загрузить сборки. Проверьте, что API запущен.</p>}
          {!buildsError && builds.length === 0 && (
            <div className="mt-12 grid gap-5 lg:grid-cols-3">
              {[0, 1, 2].map((i) => <div key={i} className="min-h-[470px] animate-pulse rounded-[2rem] bg-[#e9e9e3]" />)}
            </div>
          )}
          <div className="mt-12 grid gap-5 lg:grid-cols-3">
            {builds.map((build) => (
              <article key={build.id} className={`${build.tone} group flex min-h-[470px] flex-col rounded-[2rem] p-7 transition duration-300 hover:-translate-y-1.5 md:p-8`}>
                <div className="flex items-start justify-between">
                  <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${build.featured ? "bg-[#141510] text-white" : "bg-white/70"}`}>{build.label}</span>
                  <Icon name="arrow" className="size-6 -rotate-45 transition group-hover:rotate-0" />
                </div>
                <div className="mt-10">
                  <p className="text-6xl font-extrabold tracking-[-0.07em]">{build.name}</p>
                  <p className="mt-2 text-lg font-bold">от {formatPrice(build.price)}</p>
                </div>
                <div className="my-8 h-px bg-black/10" />
                <ul className="space-y-4">
                  {build.specs.map((spec) => (
                    <li key={spec} className="flex items-center gap-3 text-sm font-medium"><Icon name="check" className="size-4" />{spec}</li>
                  ))}
                </ul>
                <button onClick={() => chooseBuild(build)} className="mt-auto flex items-center justify-between rounded-2xl bg-white/70 px-5 py-4 text-sm font-bold transition hover:bg-white">
                  Выбрать сборку <Icon name="chevron" className="size-4" />
                </button>
              </article>
            ))}
          </div>
        </section>

        <section id="configurator" className="bg-[#dddcd4] px-5 py-24 lg:px-8 lg:py-32">
          <div className="mx-auto max-w-7xl">
            <p className="section-label">Конфигуратор</p>
            <div className="mt-4 grid gap-10 lg:grid-cols-[1fr_.72fr]">
              <div>
                <h2 className="max-w-2xl text-4xl font-extrabold tracking-[-0.05em] md:text-6xl">Начните со сценария</h2>
                <p className="mt-5 max-w-xl text-[#686961]">Ответьте на два вопроса — покажем ориентировочную стоимость. Финальную конфигурацию проверит инженер.</p>
                <div className="mt-12 space-y-10">
                  <OptionGroup title="01. Для чего нужен компьютер?" items={configOptions.purpose} value={purpose} onChange={setPurpose} />
                  <OptionGroup title="02. Какая нужна производительность?" items={configOptions.performance} value={performance} onChange={setPerformance} />
                </div>
              </div>
              <aside className="h-fit rounded-[2rem] bg-[#141510] p-7 text-white md:p-10 lg:sticky lg:top-28">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-white/50">Ваша конфигурация</p>
                  <span className="grid size-10 place-items-center rounded-xl bg-[#dfff4f] text-[#141510]"><Icon name="spark" /></span>
                </div>
                <div className="mt-16">
                  <p className="text-sm text-white/45">Ориентировочная стоимость</p>
                  <p className="mt-2 text-[clamp(2.6rem,5vw,4.5rem)] font-extrabold tracking-[-0.07em]">{formatPrice(total)}</p>
                </div>
                <div className="my-8 h-px bg-white/10" />
                <ul className="space-y-4 text-sm text-white/65">
                  {["Подбор совместимых компонентов", "Профессиональная сборка", "Стресс-тест 24 часа", "Гарантия 3 года"].map((item) => (
                    <li key={item} className="flex items-center gap-3"><span className="grid size-6 place-items-center rounded-full bg-white/10 text-[#dfff4f]"><Icon name="check" className="size-3.5" /></span>{item}</li>
                  ))}
                </ul>
                <button onClick={chooseConfig} className="mt-10 flex w-full items-center justify-center gap-3 rounded-full bg-[#dfff4f] px-6 py-4 font-bold text-[#141510] transition hover:bg-white">
                  Получить точный расчёт <Icon name="arrow" />
                </button>
              </aside>
            </div>
          </div>
        </section>

        <section id="process" className="mx-auto max-w-7xl px-5 py-24 lg:px-8 lg:py-32">
          <div className="grid gap-12 lg:grid-cols-[.75fr_1.25fr]">
            <div>
              <p className="section-label">Прозрачный процесс</p>
              <h2 className="mt-4 text-4xl font-extrabold tracking-[-0.05em] md:text-6xl">От заявки до первого запуска</h2>
            </div>
            <div className="divide-y divide-black/10 border-y border-black/10">
              {[
                ["01", "Обсуждаем задачи", "Уточняем игры, программы, бюджет и пожелания по внешнему виду."],
                ["02", "Согласовываем сборку", "Предлагаем 2–3 варианта и объясняем разницу без сложных терминов."],
                ["03", "Собираем и тестируем", "Аккуратный кабель-менеджмент и сутки тестов под полной нагрузкой."],
                ["04", "Доставляем готовым", "Windows, драйверы и нужный софт уже настроены. Остаётся только включить."],
              ].map(([num, title, text]) => (
                <div key={num} className="grid gap-4 py-7 sm:grid-cols-[64px_1fr_1.2fr] sm:items-center">
                  <span className="font-mono text-sm text-[#8b8c83]">{num}</span>
                  <h3 className="text-xl font-bold">{title}</h3>
                  <p className="text-sm leading-relaxed text-[#686961]">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="request" className="bg-[#dfff4f] px-5 py-24 lg:px-8 lg:py-32">
          <div className="mx-auto grid max-w-7xl gap-14 lg:grid-cols-[.8fr_1.2fr]">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em]">Бесплатная консультация</p>
              <h2 className="mt-5 text-5xl font-extrabold leading-[.95] tracking-[-0.065em] md:text-7xl">Соберём ПК, который подходит именно вам</h2>
              <p className="mt-7 max-w-md leading-relaxed text-black/60">Оставьте контакты — инженер свяжется с вами, задаст несколько вопросов и подготовит варианты.</p>
            </div>
            <div className="rounded-[2rem] bg-[#f4f4ef] p-7 md:p-10">
              {orderId !== null ? (
                <div className="flex min-h-[380px] flex-col items-center justify-center text-center">
                  <span className="grid size-16 place-items-center rounded-full bg-[#141510] text-[#dfff4f]"><Icon name="check" className="size-8" /></span>
                  <h3 className="mt-6 text-3xl font-extrabold tracking-[-0.04em]">Заявка №{orderId} отправлена</h3>
                  <p className="mt-3 max-w-sm text-[#686961]">Спасибо! Свяжемся с вами в рабочее время в течение 30 минут.</p>
                  <button className="mt-7 text-sm font-bold underline underline-offset-4" onClick={resetForm}>Отправить ещё одну</button>
                </div>
              ) : (
                <form onSubmit={submitForm}>
                  {(selectedBuild || useConfigurator) && (
                    <div className="mb-8 flex items-center justify-between gap-4 rounded-2xl bg-[#141510] px-5 py-4 text-white">
                      <div>
                        <p className="text-xs uppercase tracking-[0.14em] text-white/50">{selectedBuild ? "Выбранная сборка" : "Конфигуратор"}</p>
                        <p className="mt-1 font-bold">
                          {selectedBuild
                            ? `${selectedBuild.name} · ${formatPrice(selectedBuild.price)}`
                            : `${configOptions.purpose.find((p) => p.value === purpose)?.label} · ${configOptions.performance.find((p) => p.value === performance)?.label} · ${formatPrice(total)}`}
                        </p>
                      </div>
                      <button type="button" onClick={() => { setSelectedBuild(null); setUseConfigurator(false); }} aria-label="Убрать" className="grid size-9 shrink-0 place-items-center rounded-full bg-white/10 hover:bg-white/20">
                        <Icon name="x" className="size-4" />
                      </button>
                    </div>
                  )}
                  <div className="grid gap-6 sm:grid-cols-2">
                    <label className="form-field">
                      <span>Ваше имя</span>
                      <input name="name" required minLength={2} placeholder="Алексей" />
                    </label>
                    <label className="form-field">
                      <span>Телефон</span>
                      <input name="phone" type="tel" required minLength={5} placeholder="+7 999 000-00-00" />
                    </label>
                  </div>
                  <label className="form-field mt-6">
                    <span>Что хотите собрать?</span>
                    <textarea name="message" rows={4} placeholder="Например: игровой ПК до 150 000 ₽ для 2K-монитора" />
                  </label>
                  {submitError && <p className="mt-5 text-sm font-semibold text-red-700">{submitError}</p>}
                  <div className="mt-8 flex flex-col gap-5 sm:flex-row sm:items-center">
                    <button type="submit" disabled={submitting} className="inline-flex shrink-0 items-center justify-center gap-3 rounded-full bg-[#141510] px-7 py-4 font-bold text-white transition hover:scale-[1.02] disabled:opacity-60">
                      {submitting ? "Отправляем..." : "Отправить заявку"} <Icon name="arrow" />
                    </button>
                    <p className="text-xs leading-relaxed text-black/45">Нажимая кнопку, вы соглашаетесь с политикой обработки персональных данных.</p>
                  </div>
                </form>
              )}
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-[#141510] px-5 py-10 text-white lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-7 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-xl bg-[#dfff4f] text-[#141510]"><Icon name="cpu" className="size-5" /></span>
            <span className="text-lg font-extrabold">KOMPIK67.</span>
          </div>
          <p className="text-sm text-white/40">Сборка компьютеров под ключ · Москва · Доставка по России</p>
          <button onClick={() => scrollTo("top")} className="text-left text-sm font-bold text-[#dfff4f] md:text-right">Наверх ↑</button>
        </div>
      </footer>
    </div>
  );
}

function OptionGroup({
  title,
  items,
  value,
  onChange,
}: {
  title: string;
  items: { label: string; value: string; price: number }[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-4 text-sm font-bold">{title}</legend>
      <div className="grid gap-3 sm:grid-cols-3">
        {items.map((item) => {
          const selected = value === item.value;
          return (
            <button
              type="button"
              key={item.value}
              onClick={() => onChange(item.value)}
              className={`flex min-h-24 flex-col items-start justify-between rounded-2xl border p-5 text-left transition ${
                selected ? "border-[#141510] bg-[#141510] text-white" : "border-black/10 bg-white/45 hover:bg-white/80"
              }`}
            >
              <span className="text-sm font-bold">{item.label}</span>
              <span className={`size-4 rounded-full border ${selected ? "border-[#dfff4f] bg-[#dfff4f] shadow-[inset_0_0_0_3px_#141510]" : "border-black/25"}`} />
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export default App;
