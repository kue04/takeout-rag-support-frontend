import { useEffect, useMemo, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import {
  AlertCircle,
  ArrowLeft,
  Bike,
  Bot,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Database,
  Home,
  MapPin,
  MessageCircle,
  Minus,
  PackageCheck,
  Plus,
  Search,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Star,
  Store as StoreIcon,
} from "lucide-react";
import { sendChatPrompt } from "./api/chat";
import { getCategories, getExamplesByCategory, searchExamples } from "./api/examples";
import { exportEvalCase, getRecentFeedback, submitFeedback } from "./api/feedback";
import {
  archiveKnowledgeItem,
  createKnowledgeItem,
  exportApprovedKnowledge,
  getKnowledgePublishHistory,
  listKnowledgeItems,
  publishApprovedKnowledge,
  reviewKnowledgeItem,
  rollbackLatestKnowledgePublish,
  updateKnowledgeItem,
} from "./api/knowledge";
import { getModelInfo } from "./api/model";
import { getOpsMetrics } from "./api/ops";
import { getRetrievalConfig, previewRetrievalPrompt, searchRetrieval } from "./api/retrieval";
import {
  dishes,
  orderSteps,
  stores,
  type Dish,
  type OrderItem,
  type OrderStatus,
  type Store,
  type TakeoutOrder,
} from "./data/marketplace";
import { EmptyState } from "./components/EmptyState";
import { SupportView } from "./features/support/SupportView";
import { KnowledgeOpsView } from "./features/knowledge/KnowledgeOpsView";
import { ProjectShowcaseView } from "./features/showcase/ProjectShowcaseView";
import type {
  ChatMessage,
  ChatResponse,
  FeedbackItem,
  KnowledgeExample,
  KnowledgeOpsItem,
  KnowledgePayload,
  KnowledgePublishHistoryItem,
  ModelInfo,
  OpsMetrics,
  RetrievalConfig,
  RetrievalMode,
  RetrievalPromptPreviewResponse,
  RetrievalResult,
} from "./types/api";

gsap.registerPlugin(useGSAP);

type View = "home" | "store" | "checkout" | "orders" | "orderDetail" | "support" | "knowledge" | "showcase";
type Cart = Record<string, number>;
type SupportSessionMap = Record<string, string>;

const storageKey = "takeout-rag-orders";
const userStorageKey = "takeout-rag-user-id";
const supportSessionStorageKey = "takeout-rag-support-sessions";
const userAddress = "杭州西湖区文三路 168 号";
const retrievalMode: RetrievalMode = "hybrid";

export default function App() {
  const pageRef = useRef<HTMLElement | null>(null);
  const cartButtonRef = useRef<HTMLButtonElement | null>(null);
  const [view, setView] = useState<View>("home");
  const [selectedStoreId, setSelectedStoreId] = useState(stores[0].id);
  const [cart, setCart] = useState<Cart>({});
  const [orders, setOrders] = useState<TakeoutOrder[]>(() => loadOrders());
  const [userId] = useState(() => getOrCreateUserId());
  const [supportSessions, setSupportSessions] = useState<SupportSessionMap>(() => loadSupportSessions());
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [cartPulseKey, setCartPulseKey] = useState(0);
  const [isRagOpen, setIsRagOpen] = useState(false);

  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null);
  const [retrievalConfig, setRetrievalConfig] = useState<RetrievalConfig | null>(null);
  const [apiError, setApiError] = useState("");
  const [ragError, setRagError] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "您好，请选择订单问题，我会结合订单信息为您处理。",
    },
  ]);
  const [retrievalResults, setRetrievalResults] = useState<RetrievalResult[]>([]);
  const [promptPreview, setPromptPreview] = useState<RetrievalPromptPreviewResponse | null>(null);
  const [latestDiagnostics, setLatestDiagnostics] = useState<ChatResponse | null>(null);
  const [latestQuery, setLatestQuery] = useState("");
  const [recentFeedback, setRecentFeedback] = useState<FeedbackItem[]>([]);
  const [opsMetrics, setOpsMetrics] = useState<OpsMetrics | null>(null);
  const [feedbackStatus, setFeedbackStatus] = useState("");
  const [knowledgeItems, setKnowledgeItems] = useState<KnowledgeOpsItem[]>([]);
  const [knowledgeTotal, setKnowledgeTotal] = useState(0);
  const [knowledgeStatus, setKnowledgeStatus] = useState("");
  const [knowledgePublishHistory, setKnowledgePublishHistory] = useState<KnowledgePublishHistoryItem[]>([]);
  const [knowledgeCategories, setKnowledgeCategories] = useState<string[]>([]);
  const [selectedKnowledgeCategory, setSelectedKnowledgeCategory] = useState("");
  const [knowledgeExamples, setKnowledgeExamples] = useState<KnowledgeExample[]>([]);
  const [knowledgeExamplesStatus, setKnowledgeExamplesStatus] = useState("");

  const selectedStore = stores.find((store) => store.id === selectedStoreId) ?? stores[0];
  const activeOrder = orders.find((order) => order.id === activeOrderId) ?? orders[0] ?? null;
  const activeSessionId = activeOrder ? supportSessions[activeOrder.id] ?? null : null;
  const storeDishes = dishes.filter((dish) => dish.storeId === selectedStore.id);
  const cartItems = getCartItems(cart);
  const cartSubtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartStore = stores.find((store) => store.id === cartItems[0]?.storeId) ?? selectedStore;
  const cartTotal = cartSubtotal + (cartItems.length ? cartStore.deliveryFee : 0);
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const filteredStores = stores.filter((store) => {
    const keyword = searchKeyword.trim();
    if (!keyword) {
      return true;
    }
    return store.name.includes(keyword) || store.tags.some((tag) => tag.includes(keyword));
  });

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    getModelInfo()
      .then(setModelInfo)
      .catch((error: Error) => setApiError(error.message));

    getRetrievalConfig()
      .then(setRetrievalConfig)
      .catch((error: Error) => setApiError(error.message));

    void refreshOpsData();
    void refreshKnowledgeItems();
    void refreshKnowledgePublishHistory();
    void refreshKnowledgeExamples();
  }, []);

  useGSAP(
    () => {
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduceMotion) {
        return;
      }

      gsap.fromTo(
        ".view-surface",
        { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: 0.24, ease: "power3.out" },
      );
      gsap.fromTo(
        ".reveal-item",
        { opacity: 0, y: 14 },
        { opacity: 1, y: 0, duration: 0.28, stagger: 0.035, ease: "power3.out" },
      );
    },
    { scope: pageRef, dependencies: [view, selectedStoreId, activeOrderId] },
  );

  useGSAP(
    () => {
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (!cartButtonRef.current || reduceMotion || cartPulseKey === 0) {
        return;
      }

      gsap.fromTo(
        cartButtonRef.current,
        { scale: 1 },
        { scale: 1.08, duration: 0.16, yoyo: true, repeat: 1, ease: "power2.out" },
      );
    },
    { dependencies: [cartPulseKey] },
  );

  function navigate(nextView: View) {
    setView(nextView);
    if (nextView !== "support") {
      setIsRagOpen(false);
    }
  }

  function openStore(storeId: string) {
    setSelectedStoreId(storeId);
    navigate("store");
  }

  function changeDishQuantity(dish: Dish, delta: number) {
    const currentStoreId = cartItems[0]?.storeId;
    const shouldResetCart = currentStoreId && currentStoreId !== dish.storeId;

    setCart((current) => {
      const base = shouldResetCart ? {} : current;
      const nextQuantity = Math.max(0, (base[dish.id] ?? 0) + delta);
      const next = { ...base };

      if (nextQuantity === 0) {
        delete next[dish.id];
      } else {
        next[dish.id] = nextQuantity;
      }

      return next;
    });

    if (delta > 0) {
      setCartPulseKey((current) => current + 1);
    }
  }

  function submitOrder() {
    if (!cartItems.length) {
      return;
    }

    const store = stores.find((item) => item.id === cartItems[0].storeId) ?? selectedStore;
    const order: TakeoutOrder = {
      id: `WM${Date.now().toString().slice(-8)}`,
      storeId: store.id,
      storeName: store.name,
      items: cartItems.map<OrderItem>((item) => ({
        dishId: item.id,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
      })),
      subtotal: cartSubtotal,
      deliveryFee: store.deliveryFee,
      total: cartTotal,
      status: "preparing",
      deliveryStatus: "商家正在备餐，预计 28 分钟送达",
      address: userAddress,
      createdAt: new Date().toLocaleString("zh-CN", { hour12: false }),
    };

    setOrders((current) => [order, ...current]);
    setCart({});
    setActiveOrderId(order.id);
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content: "您好，请选择订单问题，我会结合订单信息为您处理。",
      },
    ]);
    setRetrievalResults([]);
    setPromptPreview(null);
    setLatestDiagnostics(null);
    navigate("orderDetail");
  }

  async function sendSupportMessage(question: string) {
    const normalizedQuestion = question.trim();
    if (!normalizedQuestion || !activeOrder) {
      return;
    }

    setApiError("");
    setRagError("");
    setFeedbackStatus("");
    setLatestQuery(normalizedQuestion);
    setIsChatLoading(true);
    setMessages((current) => [
      ...current,
      { id: crypto.randomUUID(), role: "user", content: normalizedQuestion },
    ]);

    const messageWithContext = buildOrderContextMessage(activeOrder, normalizedQuestion);
    const currentSessionId = supportSessions[activeOrder.id] ?? null;
    const retrievalPayload = {
      query: normalizedQuestion,
      mode: retrievalMode,
      limit: 5,
      min_score: 0.62,
    };

    try {
      const [chatResult, searchResult, previewResult] = await Promise.allSettled([
        sendChatPrompt({
          message: messageWithContext,
          user_id: userId,
          session_id: currentSessionId,
          order_id: activeOrder.id,
        }),
        searchRetrieval(retrievalPayload),
        previewRetrievalPrompt(retrievalPayload),
      ]);

      if (searchResult.status === "fulfilled") {
        setRetrievalResults(searchResult.value.results);
      } else {
        setRagError(getErrorMessage(searchResult.reason, "检索接口请求失败"));
      }

      if (previewResult.status === "fulfilled") {
        setPromptPreview(previewResult.value);
      } else {
        setRagError(getErrorMessage(previewResult.reason, "prompt preview 请求失败"));
      }

      if (chatResult.status === "fulfilled") {
        setLatestDiagnostics(chatResult.value);

        if (chatResult.value.session_id) {
          setSupportSessions((current) => {
            const next = { ...current, [activeOrder.id]: chatResult.value.session_id as string };
            saveSupportSessions(next);
            return next;
          });
        }

        setMessages((current) => [
          ...current,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: chatResult.value.reply,
            confidenceScore: chatResult.value.confidence_score,
            retrievedDocuments: chatResult.value.retrieved_documents,
          },
        ]);

        if (chatResult.value.retrieved_items?.length) {
          setRetrievalResults(chatResult.value.retrieved_items);
        }
      } else {
        setApiError(getErrorMessage(chatResult.reason, "客服接口请求失败"));
      }
    } finally {
      setIsChatLoading(false);
    }
  }

  function openSupport(order: TakeoutOrder) {
    setActiveOrderId(order.id);
    navigate("support");
  }

  function selectSupportScenario(scenario: { id: string; status: OrderStatus; deliveryStatus: string }) {
    const baseOrder = activeOrder ?? orders[0] ?? createScenarioOrder(scenario);
    const scenarioOrder: TakeoutOrder = {
      ...baseOrder,
      id: scenario.id,
      status: scenario.status,
      deliveryStatus: scenario.deliveryStatus,
      createdAt: baseOrder.createdAt || new Date().toLocaleString("zh-CN", { hour12: false }),
    };

    setOrders((current) => [scenarioOrder, ...current.filter((order) => order.id !== scenarioOrder.id)]);
    setActiveOrderId(scenarioOrder.id);
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content: "您好，请选择订单问题，我会结合订单信息为您处理。",
      },
    ]);
    setRetrievalResults([]);
    setPromptPreview(null);
    setLatestDiagnostics(null);
  }

  async function copyDebugReport() {
    await navigator.clipboard.writeText(
      buildDebugReport({
        order: activeOrder,
        results: retrievalResults,
        prompt: latestDiagnostics?.final_prompt || promptPreview?.final_prompt || promptPreview?.prompt || "",
        diagnostics: latestDiagnostics,
      }),
    );
  }

  async function refreshOpsData() {
    const [feedbackResult, metricsResult] = await Promise.allSettled([getRecentFeedback(), getOpsMetrics()]);
    if (feedbackResult.status === "fulfilled") {
      setRecentFeedback(feedbackResult.value.items);
    }
    if (metricsResult.status === "fulfilled") {
      setOpsMetrics(metricsResult.value);
    }
  }

  async function sendFeedback(helpful: boolean, reason = "", expectedReply = "") {
    if (!latestDiagnostics) {
      setFeedbackStatus("暂无可反馈的回答");
      return;
    }
    await submitFeedback({
      request_id: latestDiagnostics.trace?.request_id || crypto.randomUUID(),
      query: latestQuery || messages.filter((message) => message.role === "user").at(-1)?.content || "",
      reply: latestDiagnostics.reply,
      helpful,
      reason,
      expected_reply: expectedReply,
      trace: latestDiagnostics.trace,
    });
    setFeedbackStatus(helpful ? "已记录有帮助反馈" : "已保存 bad case");
    await refreshOpsData();
  }

  async function copyEvalCase(feedbackId: number) {
    const result = await exportEvalCase(feedbackId);
    await navigator.clipboard.writeText(JSON.stringify(result.eval_case, null, 2));
  }

  async function refreshKnowledgeItems(filters: { status?: string; keyword?: string } = {}) {
    const result = await listKnowledgeItems({ ...filters, limit: 30 });
    setKnowledgeItems(result.items);
    setKnowledgeTotal(result.total);
  }

  async function refreshKnowledgePublishHistory() {
    const result = await getKnowledgePublishHistory();
    setKnowledgePublishHistory(result.items);
  }

  async function refreshKnowledgeExamples(category?: string) {
    const categoryResult = await getCategories();
    const categories = categoryResult.categories;
    const nextCategory = category || selectedKnowledgeCategory || categories[0] || "";

    setKnowledgeCategories(categories);
    setSelectedKnowledgeCategory(nextCategory);

    if (!nextCategory) {
      setKnowledgeExamples([]);
      setKnowledgeExamplesStatus("正式知识库暂无分类");
      return;
    }

    const examplesResult = await getExamplesByCategory(nextCategory, 50);
    setKnowledgeExamples(examplesResult.examples);
    setKnowledgeExamplesStatus(`已加载 ${examplesResult.examples.length} 条正式知识`);
  }

  async function selectKnowledgeCategory(category: string) {
    setSelectedKnowledgeCategory(category);
    const result = await getExamplesByCategory(category, 50);
    setKnowledgeExamples(result.examples);
    setKnowledgeExamplesStatus(`已加载 ${result.examples.length} 条正式知识`);
  }

  async function searchKnowledgeExamples(keyword: string) {
    const normalizedKeyword = keyword.trim();
    if (!normalizedKeyword) {
      await refreshKnowledgeExamples(selectedKnowledgeCategory);
      return;
    }
    const result = await searchExamples(normalizedKeyword, 50);
    setKnowledgeExamples(result.results);
    setKnowledgeExamplesStatus(`搜索到 ${result.results.length} 条正式知识`);
  }

  async function createKnowledge(payload: KnowledgePayload) {
    await createKnowledgeItem(payload);
    setKnowledgeStatus("已保存草稿");
    await refreshKnowledgeItems();
  }

  async function updateKnowledge(id: number, payload: KnowledgePayload) {
    await updateKnowledgeItem(id, payload);
    setKnowledgeStatus("已生成新版本草稿");
    await refreshKnowledgeItems();
  }

  async function archiveKnowledge(id: number) {
    await archiveKnowledgeItem(id);
    setKnowledgeStatus("已下架");
    await refreshKnowledgeItems();
  }

  async function reviewKnowledge(id: number, status: "approved" | "rejected") {
    await reviewKnowledgeItem(id, status);
    setKnowledgeStatus(status === "approved" ? "已审核通过" : "已审核拒绝");
    await refreshKnowledgeItems();
  }

  async function copyApprovedKnowledge() {
    const result = await exportApprovedKnowledge();
    await navigator.clipboard.writeText(result.jsonl);
    setKnowledgeStatus(`已复制 ${result.count} 条 approved JSONL`);
  }

  async function publishKnowledge() {
    const result = await publishApprovedKnowledge();
    setKnowledgeStatus(`发布 ${result.merged_count} 条，状态：${result.status}`);
    await Promise.all([refreshKnowledgeItems(), refreshKnowledgePublishHistory()]);
  }

  async function rollbackKnowledge() {
    const result = await rollbackLatestKnowledgePublish();
    setKnowledgeStatus(`已回滚最近发布，状态：${result.status}`);
    await Promise.all([refreshKnowledgeItems(), refreshKnowledgePublishHistory()]);
  }

  return (
    <main ref={pageRef} className="min-h-screen w-full max-w-full overflow-x-hidden bg-[#f4f7f5] text-ink">
      <PlatformHeader
        cartCount={cartCount}
        activeView={view}
        modelInfo={modelInfo}
        retrievalConfig={retrievalConfig}
        apiError={apiError}
        onNavigate={navigate}
      />

      <div className="mx-auto max-w-[1480px] px-3 pb-24 pt-4 md:px-5 lg:pb-8">
        {view === "home" ? (
          <HomeView
            searchKeyword={searchKeyword}
            stores={filteredStores}
            onSearchChange={setSearchKeyword}
            onOpenStore={openStore}
            onOpenOrders={() => navigate("orders")}
          />
        ) : null}

        {view === "store" ? (
          <StoreView
            store={selectedStore}
            dishes={storeDishes}
            cart={cart}
            onBack={() => navigate("home")}
            onChangeDishQuantity={changeDishQuantity}
          />
        ) : null}

        {view === "checkout" ? (
          <CheckoutView
            store={cartStore}
            cartItems={cartItems}
            subtotal={cartSubtotal}
            total={cartTotal}
            onBack={() => navigate("store")}
            onSubmitOrder={submitOrder}
          />
        ) : null}

        {view === "orders" ? (
          <OrdersView
            orders={orders}
            onBack={() => navigate("home")}
            onOpenOrder={(order) => {
              setActiveOrderId(order.id);
              navigate("orderDetail");
            }}
          />
        ) : null}

        {view === "orderDetail" ? (
          <OrderDetailView
            order={activeOrder}
            onBack={() => navigate("orders")}
            onSupport={openSupport}
          />
        ) : null}

        {view === "support" ? (
          <SupportView
            order={activeOrder}
            userId={userId}
            sessionId={activeSessionId}
            messages={messages}
            retrievalResults={retrievalResults}
            promptPreview={promptPreview}
            diagnostics={latestDiagnostics}
            apiError={apiError}
            ragError={ragError}
            isLoading={isChatLoading}
            isRagOpen={isRagOpen}
            onBack={() => navigate("orderDetail")}
            onSend={sendSupportMessage}
            onToggleRag={() => setIsRagOpen((current) => !current)}
            onCloseRag={() => setIsRagOpen(false)}
            onCopyReport={copyDebugReport}
            onSubmitFeedback={sendFeedback}
            feedbackStatus={feedbackStatus}
            recentFeedback={recentFeedback}
            opsMetrics={opsMetrics}
            onCopyEvalCase={copyEvalCase}
            onSelectScenario={selectSupportScenario}
          />
        ) : null}

        {view === "knowledge" ? (
          <KnowledgeOpsView
            items={knowledgeItems}
            total={knowledgeTotal}
            statusText={knowledgeStatus}
            publishHistory={knowledgePublishHistory}
            categories={knowledgeCategories}
            selectedCategory={selectedKnowledgeCategory}
            examples={knowledgeExamples}
            examplesStatus={knowledgeExamplesStatus}
            onBack={() => navigate("home")}
            onRefresh={refreshKnowledgeItems}
            onRefreshExamples={() => refreshKnowledgeExamples(selectedKnowledgeCategory)}
            onCategoryChange={selectKnowledgeCategory}
            onSearchExamples={searchKnowledgeExamples}
            onCreate={createKnowledge}
            onUpdate={updateKnowledge}
            onArchive={archiveKnowledge}
            onReview={reviewKnowledge}
            onExportApproved={copyApprovedKnowledge}
            onPublishApproved={publishKnowledge}
            onRollbackLatest={rollbackKnowledge}
            onRefreshPublishHistory={refreshKnowledgePublishHistory}
          />
        ) : null}

        {view === "showcase" ? <ProjectShowcaseView onBack={() => navigate("home")} /> : null}
      </div>

      {cartCount > 0 && view !== "checkout" && view !== "support" && view !== "showcase" ? (
        <CartBar
          refButton={cartButtonRef}
          count={cartCount}
          subtotal={cartSubtotal}
          total={cartTotal}
          store={cartStore}
          onCheckout={() => navigate("checkout")}
        />
      ) : null}

      <MobileNav activeView={view} cartCount={cartCount} onNavigate={navigate} />
    </main>
  );
}

function PlatformHeader({
  cartCount,
  activeView,
  modelInfo,
  retrievalConfig,
  apiError,
  onNavigate,
}: {
  cartCount: number;
  activeView: View;
  modelInfo: ModelInfo | null;
  retrievalConfig: RetrievalConfig | null;
  apiError: string;
  onNavigate: (view: View) => void;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white">
      <div className="mx-auto flex max-w-[1480px] items-center gap-3 px-3 py-3 md:px-5">
        <button
          className="flex items-center gap-2 rounded-work bg-ink px-3 py-2 text-sm font-extrabold text-white"
          type="button"
          onClick={() => onNavigate("home")}
        >
          <ShoppingBag size={17} />
          即时外卖
        </button>
        <div className="hidden min-w-0 flex-1 items-center gap-2 rounded-work border border-line bg-subtle px-3 py-2 text-sm text-muted md:flex">
          <MapPin size={16} className="shrink-0 text-leaf" />
          <span className="truncate">{userAddress}</span>
        </div>
        <div className="hidden items-center gap-2 rounded-work border border-line bg-white px-3 py-2 text-xs font-bold text-muted lg:flex">
          <Bot size={15} className={apiError ? "text-danger" : "text-leaf"} />
          <span>{modelInfo?.base_model ?? "模型状态加载中"}</span>
          <span className="text-line">|</span>
          <span>{retrievalConfig?.reranker_model ?? "RAG 配置加载中"}</span>
        </div>
        {apiError ? (
          <div className="hidden max-w-[300px] items-center gap-2 rounded-work border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 xl:flex">
            <AlertCircle size={15} />
            <span className="truncate">{apiError}</span>
          </div>
        ) : null}
        <button
          className={`hidden rounded-work px-3 py-2 text-sm font-bold md:block ${
            activeView === "orders" ? "bg-emerald-50 text-leaf" : "text-muted hover:bg-subtle"
          }`}
          type="button"
          onClick={() => onNavigate("orders")}
        >
          我的订单
        </button>
        <button
          className={`hidden items-center gap-2 rounded-work px-3 py-2 text-sm font-bold md:inline-flex ${
            activeView === "knowledge" ? "bg-emerald-50 text-leaf" : "text-muted hover:bg-subtle"
          }`}
          type="button"
          onClick={() => onNavigate("knowledge")}
        >
          <Database size={16} />
          知识运营
        </button>
        <button
          className={`hidden items-center gap-2 rounded-work px-3 py-2 text-sm font-bold md:inline-flex ${
            activeView === "showcase" ? "bg-emerald-50 text-leaf" : "text-muted hover:bg-subtle"
          }`}
          type="button"
          onClick={() => onNavigate("showcase")}
        >
          <Sparkles size={16} />
          项目展示
        </button>
        <button
          className="relative grid h-10 w-10 place-items-center rounded-work border border-line bg-white text-ink"
          type="button"
          onClick={() => onNavigate(cartCount ? "checkout" : "home")}
          title="购物车"
        >
          <ShoppingCart size={18} />
          {cartCount ? (
            <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-amberline px-1 text-[11px] font-extrabold text-white">
              {cartCount}
            </span>
          ) : null}
        </button>
      </div>
    </header>
  );
}

function HomeView({
  searchKeyword,
  stores,
  onSearchChange,
  onOpenStore,
  onOpenOrders,
}: {
  searchKeyword: string;
  stores: Store[];
  onSearchChange: (value: string) => void;
  onOpenStore: (storeId: string) => void;
  onOpenOrders: () => void;
}) {
  const hotDishes = dishes.slice(0, 4);

  return (
    <section className="view-surface space-y-4">
      <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="reveal-item overflow-hidden rounded-[16px] bg-ink text-white">
          <div className="grid min-h-[320px] gap-4 p-5 md:grid-cols-[1fr_240px] md:p-7">
            <div className="flex flex-col justify-between">
              <div>
                <p className="text-sm font-bold text-emerald-100">30 分钟内送达附近好店</p>
                <h1 className="mt-4 max-w-4xl text-[2rem] font-black leading-tight tracking-normal md:text-[3rem]">
                  点一份热饭，再把订单问题交给 RAG 客服
                </h1>
                <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-200">
                  从下单到售后都在同一个平台里完成，客服回复会结合订单上下文，同时保留证据解释给演示人员查看。
                </p>
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  className="rounded-work bg-white px-4 py-2.5 text-sm font-extrabold text-ink"
                  type="button"
                  onClick={() => onOpenStore(stores[0]?.id ?? "green-bowl")}
                >
                  浏览附近店铺
                </button>
                <button
                  className="rounded-work border border-white/30 px-4 py-2.5 text-sm font-extrabold text-white"
                  type="button"
                  onClick={onOpenOrders}
                >
                  查看订单售后
                </button>
              </div>
            </div>
            <div className="group overflow-hidden rounded-[14px] bg-white/10">
              <img
                className="h-full min-h-[220px] w-full object-cover opacity-90 contrast-125 transition-transform duration-700 ease-out group-hover:scale-105"
                src="https://picsum.photos/seed/takeout-dinner/900/1100"
                alt="外卖餐食"
              />
            </div>
          </div>
        </div>

        <div className="reveal-item grid grid-cols-4 gap-3 [grid-auto-flow:dense]">
          <div className="col-span-2 rounded-[16px] bg-white p-4">
            <div className="flex items-center gap-2 text-sm font-extrabold">
              <MapPin size={17} className="text-leaf" />
              配送到
            </div>
            <p className="mt-3 text-lg font-black">{userAddress}</p>
            <p className="mt-2 text-sm text-muted">系统会把订单信息拼入客服问题，方便 RAG 根据业务场景回答。</p>
          </div>
          <div className="col-span-1 rounded-[16px] bg-emerald-50 p-4 text-leaf">
            <Clock3 size={18} />
            <p className="mt-4 text-xl font-black">28 分钟</p>
            <p className="mt-1 text-xs font-bold">最快送达</p>
          </div>
          <div className="col-span-1 rounded-[16px] bg-orange-50 p-4 text-amberline">
            <Sparkles size={18} />
            <p className="mt-4 text-xl font-black">满减</p>
            <p className="mt-1 text-xs font-bold">展示优惠场景</p>
          </div>
          <div className="col-span-1 rounded-[16px] bg-white p-4">
            <p className="text-sm font-black">退款</p>
            <p className="mt-2 text-xs leading-5 text-muted">覆盖售后知识库。</p>
          </div>
          <div className="col-span-1 rounded-[16px] bg-white p-4">
            <p className="text-sm font-black">配送</p>
            <p className="mt-2 text-xs leading-5 text-muted">适配超时问题。</p>
          </div>
          <div className="col-span-2 rounded-[16px] bg-white p-4">
            <p className="text-sm font-black">RAG 解释侧栏</p>
            <p className="mt-2 text-xs leading-5 text-muted">
              用户侧只看客服回复，演示侧可以查看检索证据、prompt context 和 trace。
            </p>
          </div>
        </div>
      </div>

      <div className="reveal-item rounded-[16px] bg-white p-3">
        <div className="flex items-center gap-2 rounded-work border border-line bg-subtle px-3 py-2">
          <Search size={17} className="text-muted" />
          <input
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted"
            placeholder="搜索店铺、轻食、面条、优惠券"
            value={searchKeyword}
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <div className="space-y-3">
          <SectionHeader title="附近好店" subtitle="选择店铺后可加购菜品并生成本地订单" />
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {stores.map((store) => (
              <StoreCard key={store.id} store={store} onOpen={() => onOpenStore(store.id)} />
            ))}
          </div>
        </div>
        <div className="space-y-3">
          <SectionHeader title="热卖菜品" subtitle="用于快速展示加购动效" />
          <div className="space-y-3">
            {hotDishes.map((dish) => (
              <article key={dish.id} className="reveal-item flex gap-3 rounded-[16px] bg-white p-3">
                <img className="h-20 w-20 rounded-work object-cover" src={dish.image} alt={dish.name} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black">{dish.name}</p>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted">{dish.description}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="font-black text-amberline">¥{dish.price}</span>
                    <button
                      className="rounded-work bg-ink px-3 py-1.5 text-xs font-extrabold text-white"
                      type="button"
                      onClick={() => onOpenStore(dish.storeId)}
                    >
                      去店铺
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function StoreCard({ store, onOpen }: { store: Store; onOpen: () => void }) {
  return (
    <button
      className="reveal-item group overflow-hidden rounded-[16px] bg-white text-left transition-transform duration-300 hover:-translate-y-0.5"
      type="button"
      onClick={onOpen}
    >
      <div className="overflow-hidden">
        <img
          className="h-40 w-full object-cover contrast-110 transition-transform duration-700 ease-out group-hover:scale-105"
          src={store.cover}
          alt={store.name}
        />
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-base font-black">{store.name}</h2>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-bold text-muted">
              <span className="inline-flex items-center gap-1 text-amberline">
                <Star size={13} fill="currentColor" />
                {store.rating}
              </span>
              <span>{store.deliveryMinutes} 分钟</span>
              <span>起送 ¥{store.minOrder}</span>
            </div>
          </div>
          <ChevronRight size={18} className="mt-1 text-muted" />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {store.tags.map((tag) => (
            <span key={tag} className="rounded-full bg-subtle px-2 py-1 text-[11px] font-bold text-muted">
              {tag}
            </span>
          ))}
        </div>
      </div>
    </button>
  );
}

function StoreView({
  store,
  dishes,
  cart,
  onBack,
  onChangeDishQuantity,
}: {
  store: Store;
  dishes: Dish[];
  cart: Cart;
  onBack: () => void;
  onChangeDishQuantity: (dish: Dish, delta: number) => void;
}) {
  const categories = Array.from(new Set(dishes.map((dish) => dish.category)));

  return (
    <section className="view-surface space-y-4">
      <button className="inline-flex items-center gap-2 text-sm font-bold text-muted" type="button" onClick={onBack}>
        <ArrowLeft size={17} />
        返回首页
      </button>
      <div className="overflow-hidden rounded-[16px] bg-white">
        <div className="relative h-56 overflow-hidden">
          <img className="h-full w-full object-cover contrast-110" src={store.cover} alt={store.name} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-black/10" />
          <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
            <h1 className="text-2xl font-black">{store.name}</h1>
            <div className="mt-2 flex flex-wrap gap-3 text-sm font-bold text-slate-100">
              <span>评分 {store.rating}</span>
              <span>{store.deliveryMinutes} 分钟送达</span>
              <span>配送费 ¥{store.deliveryFee}</span>
              <span>起送 ¥{store.minOrder}</span>
            </div>
          </div>
        </div>
        <p className="border-t border-line bg-subtle px-5 py-3 text-sm text-muted">{store.notice}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[180px_1fr]">
        <aside className="reveal-item h-fit rounded-[16px] bg-white p-3">
          <p className="mb-2 px-2 text-sm font-black">菜品分类</p>
          <div className="space-y-1">
            {categories.map((category) => (
              <a
                key={category}
                className="block rounded-work px-2 py-2 text-sm font-bold text-muted hover:bg-subtle hover:text-ink"
                href={`#${category}`}
              >
                {category}
              </a>
            ))}
          </div>
        </aside>
        <div className="space-y-5">
          {categories.map((category) => (
            <section key={category} id={category} className="space-y-3 scroll-mt-24">
              <SectionHeader title={category} subtitle="加购后可进入确认订单" />
              <div className="grid gap-3 md:grid-cols-2">
                {dishes
                  .filter((dish) => dish.category === category)
                  .map((dish) => (
                    <DishCard
                      key={dish.id}
                      dish={dish}
                      quantity={cart[dish.id] ?? 0}
                      onChange={onChangeDishQuantity}
                    />
                  ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </section>
  );
}

function DishCard({
  dish,
  quantity,
  onChange,
}: {
  dish: Dish;
  quantity: number;
  onChange: (dish: Dish, delta: number) => void;
}) {
  return (
    <article className="reveal-item group flex gap-3 rounded-[16px] bg-white p-3">
      <div className="overflow-hidden rounded-work">
        <img
          className="h-28 w-28 object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          src={dish.image}
          alt={dish.name}
        />
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-base font-black">{dish.name}</h3>
        <p className="mt-1 line-clamp-2 text-sm leading-5 text-muted">{dish.description}</p>
        <p className="mt-2 text-xs font-bold text-muted">月售 {dish.monthlySales}</p>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-lg font-black text-amberline">¥{dish.price}</span>
          {quantity ? (
            <div className="flex items-center gap-2">
              <button
                className="grid h-8 w-8 place-items-center rounded-full border border-line bg-white text-ink"
                type="button"
                onClick={() => onChange(dish, -1)}
              >
                <Minus size={15} />
              </button>
              <span className="w-5 text-center text-sm font-black">{quantity}</span>
              <button
                className="grid h-8 w-8 place-items-center rounded-full bg-leaf text-white"
                type="button"
                onClick={() => onChange(dish, 1)}
              >
                <Plus size={15} />
              </button>
            </div>
          ) : (
            <button
              className="inline-flex items-center gap-1 rounded-full bg-leaf px-3 py-1.5 text-xs font-extrabold text-white"
              type="button"
              onClick={() => onChange(dish, 1)}
            >
              <Plus size={14} />
              加入
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

function CheckoutView({
  store,
  cartItems,
  subtotal,
  total,
  onBack,
  onSubmitOrder,
}: {
  store: Store;
  cartItems: Array<Dish & { quantity: number }>;
  subtotal: number;
  total: number;
  onBack: () => void;
  onSubmitOrder: () => void;
}) {
  return (
    <section className="view-surface mx-auto max-w-3xl space-y-4">
      <button className="inline-flex items-center gap-2 text-sm font-bold text-muted" type="button" onClick={onBack}>
        <ArrowLeft size={17} />
        返回店铺
      </button>
      <div className="rounded-[16px] bg-white p-5">
        <h1 className="text-xl font-black">确认订单</h1>
        <div className="mt-4 rounded-work bg-subtle p-3">
          <p className="text-sm font-black">配送地址</p>
          <p className="mt-1 text-sm text-muted">{userAddress}</p>
        </div>
      </div>
      <div className="rounded-[16px] bg-white p-5">
        <div className="mb-3 flex items-center gap-2 text-base font-black">
          <StoreIcon size={18} />
          {store.name}
        </div>
        <div className="divide-y divide-line">
          {cartItems.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-3 py-3">
              <div>
                <p className="text-sm font-bold">{item.name}</p>
                <p className="mt-1 text-xs text-muted">x {item.quantity}</p>
              </div>
              <span className="font-black">¥{item.price * item.quantity}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 space-y-2 text-sm">
          <PriceRow label="商品小计" value={subtotal} />
          <PriceRow label="配送费" value={store.deliveryFee} />
          <div className="flex items-center justify-between pt-2 text-lg font-black">
            <span>支付金额</span>
            <span className="text-amberline">¥{total.toFixed(1)}</span>
          </div>
        </div>
        <button
          className="mt-5 w-full rounded-work bg-ink px-4 py-3 text-sm font-extrabold text-white disabled:opacity-50"
          type="button"
          disabled={!cartItems.length}
          onClick={onSubmitOrder}
        >
          提交订单
        </button>
      </div>
    </section>
  );
}

function OrdersView({
  orders,
  onBack,
  onOpenOrder,
}: {
  orders: TakeoutOrder[];
  onBack: () => void;
  onOpenOrder: (order: TakeoutOrder) => void;
}) {
  return (
    <section className="view-surface mx-auto max-w-4xl space-y-4">
      <button className="inline-flex items-center gap-2 text-sm font-bold text-muted" type="button" onClick={onBack}>
        <ArrowLeft size={17} />
        返回首页
      </button>
      <SectionHeader title="我的订单" subtitle="从订单详情进入客服售后" />
      {orders.length ? (
        <div className="space-y-3">
          {orders.map((order) => (
            <button
              key={order.id}
              className="reveal-item w-full rounded-[16px] bg-white p-4 text-left"
              type="button"
              onClick={() => onOpenOrder(order)}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-black">{order.storeName}</p>
                  <p className="mt-1 text-xs font-bold text-muted">{order.createdAt} · {order.id}</p>
                </div>
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-extrabold text-leaf">
                  {order.deliveryStatus}
                </span>
              </div>
              <p className="mt-3 line-clamp-1 text-sm text-muted">
                {order.items.map((item) => `${item.name} x${item.quantity}`).join("，")}
              </p>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-sm font-black">¥{order.total.toFixed(1)}</span>
                <span className="inline-flex items-center gap-1 text-sm font-bold text-leaf">
                  查看详情
                  <ChevronRight size={15} />
                </span>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <EmptyState title="还没有订单" text="先去首页选择店铺，下单后可以在这里进入客服售后。" />
      )}
    </section>
  );
}

function OrderDetailView({
  order,
  onBack,
  onSupport,
}: {
  order: TakeoutOrder | null;
  onBack: () => void;
  onSupport: (order: TakeoutOrder) => void;
}) {
  if (!order) {
    return (
      <section className="view-surface mx-auto max-w-3xl">
        <EmptyState title="没有选中订单" text="请先创建订单或从订单列表进入详情。" />
      </section>
    );
  }

  return (
    <section className="view-surface mx-auto max-w-5xl space-y-4">
      <button className="inline-flex items-center gap-2 text-sm font-bold text-muted" type="button" onClick={onBack}>
        <ArrowLeft size={17} />
        返回订单
      </button>
      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          <div className="rounded-[16px] bg-white p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-muted">订单 {order.id}</p>
                <h1 className="mt-2 text-2xl font-black">{order.deliveryStatus}</h1>
                <p className="mt-2 text-sm text-muted">如配送、退款或商品问题，可从此订单直接联系客服。</p>
              </div>
              <PackageCheck className="text-leaf" size={30} />
            </div>
            <OrderTimeline status={order.status} />
          </div>
          <div className="rounded-[16px] bg-white p-5">
            <h2 className="text-base font-black">{order.storeName}</h2>
            <div className="mt-3 divide-y divide-line">
              {order.items.map((item) => (
                <div key={item.dishId} className="flex items-center justify-between py-3 text-sm">
                  <span>{item.name} x{item.quantity}</span>
                  <span className="font-bold">¥{item.price * item.quantity}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 space-y-2 text-sm">
              <PriceRow label="商品小计" value={order.subtotal} />
              <PriceRow label="配送费" value={order.deliveryFee} />
              <PriceRow label="实付" value={order.total} strong />
            </div>
          </div>
        </div>
        <aside className="h-fit rounded-[16px] bg-white p-5">
          <h2 className="text-base font-black">订单服务</h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            客服会收到订单号、店铺、商品、配送状态和用户问题。右侧解释区会展示 RAG 检索证据。
          </p>
          <button
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-work bg-leaf px-4 py-3 text-sm font-extrabold text-white"
            type="button"
            onClick={() => onSupport(order)}
          >
            <MessageCircle size={17} />
            联系客服
          </button>
        </aside>
      </div>
    </section>
  );
}

function OrderTimeline({ status }: { status: OrderStatus }) {
  const activeIndex = orderSteps.findIndex((step) => step.key === status);

  return (
    <div className="mt-6 grid grid-cols-4 gap-2">
      {orderSteps.map((step, index) => {
        const active = index <= activeIndex;
        return (
          <div key={step.key} className="reveal-item">
            <div className={`h-2 rounded-full ${active ? "bg-leaf" : "bg-subtle"}`} />
            <div className="mt-2 flex items-center gap-1 text-xs font-bold">
              {active ? <CheckCircle2 size={14} className="text-leaf" /> : <Clock3 size={14} className="text-muted" />}
              <span className={active ? "text-ink" : "text-muted"}>{step.label}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CartBar({
  refButton,
  count,
  subtotal,
  total,
  store,
  onCheckout,
}: {
  refButton: React.RefObject<HTMLButtonElement | null>;
  count: number;
  subtotal: number;
  total: number;
  store: Store;
  onCheckout: () => void;
}) {
  return (
    <div className="fixed bottom-16 left-0 right-0 z-30 px-3 md:bottom-5">
      <div className="mx-auto flex max-w-3xl items-center gap-3 rounded-[16px] bg-ink p-3 text-white">
        <div className="grid h-11 w-11 place-items-center rounded-full bg-white text-ink">
          <ShoppingCart size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black">{count} 件商品 · ¥{subtotal.toFixed(1)}</p>
          <p className="mt-0.5 truncate text-xs text-slate-300">配送费 ¥{store.deliveryFee}，预计共 ¥{total.toFixed(1)}</p>
        </div>
        <button
          ref={refButton}
          className="rounded-work bg-leaf px-4 py-2.5 text-sm font-extrabold text-white"
          type="button"
          onClick={onCheckout}
        >
          去结算
        </button>
      </div>
    </div>
  );
}

function MobileNav({
  activeView,
  cartCount,
  onNavigate,
}: {
  activeView: View;
  cartCount: number;
  onNavigate: (view: View) => void;
}) {
  const items = [
    { view: "home" as View, label: "首页", icon: Home },
    { view: "orders" as View, label: "订单", icon: PackageCheck },
    { view: "showcase" as View, label: "展示", icon: Sparkles },
    { view: cartCount ? ("checkout" as View) : ("home" as View), label: "购物车", icon: ShoppingCart },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 grid grid-cols-4 border-t border-line bg-white md:hidden">
      {items.map((item) => {
        const Icon = item.icon;
        const active = activeView === item.view;
        return (
          <button
            key={item.label}
            className={`relative flex flex-col items-center gap-1 py-2 text-xs font-bold ${active ? "text-leaf" : "text-muted"}`}
            type="button"
            onClick={() => onNavigate(item.view)}
          >
            <Icon size={19} />
            {item.label}
            {item.label === "购物车" && cartCount ? (
              <span className="absolute right-[28%] top-1 grid h-4 min-w-4 place-items-center rounded-full bg-amberline px-1 text-[10px] text-white">
                {cartCount}
              </span>
            ) : null}
          </button>
        );
      })}
    </nav>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="reveal-item flex items-end justify-between gap-3">
      <div>
        <h2 className="text-lg font-black">{title}</h2>
        <p className="mt-1 text-sm text-muted">{subtitle}</p>
      </div>
    </div>
  );
}

function PriceRow({ label, value, strong = false }: { label: string; value: number; strong?: boolean }) {
  return (
    <div className={`flex items-center justify-between ${strong ? "font-black" : "text-muted"}`}>
      <span>{label}</span>
      <span>¥{value.toFixed(1)}</span>
    </div>
  );
}

function getCartItems(cart: Cart) {
  return Object.entries(cart)
    .map(([dishId, quantity]) => {
      const dish = dishes.find((item) => item.id === dishId);
      return dish ? { ...dish, quantity } : null;
    })
    .filter((item): item is Dish & { quantity: number } => Boolean(item));
}

function loadOrders(): TakeoutOrder[] {
  try {
    const raw = localStorage.getItem(storageKey);
    return raw ? (JSON.parse(raw) as TakeoutOrder[]) : [];
  } catch {
    return [];
  }
}

function getOrCreateUserId() {
  const existing = localStorage.getItem(userStorageKey);
  if (existing) {
    return existing;
  }

  const userId = `demo_user_${crypto.randomUUID()}`;
  localStorage.setItem(userStorageKey, userId);
  return userId;
}

function loadSupportSessions(): SupportSessionMap {
  try {
    const raw = localStorage.getItem(supportSessionStorageKey);
    return raw ? (JSON.parse(raw) as SupportSessionMap) : {};
  } catch {
    return {};
  }
}

function saveSupportSessions(sessions: SupportSessionMap) {
  localStorage.setItem(supportSessionStorageKey, JSON.stringify(sessions));
}

function buildOrderContextMessage(order: TakeoutOrder, question: string) {
  return `订单上下文：
订单号：${order.id}
店铺：${order.storeName}
商品：${order.items.map((item) => `${item.name} x${item.quantity}`).join("，")}
订单状态：${order.status}
配送状态：${order.deliveryStatus}
支付金额：¥${order.total.toFixed(1)}
用户问题：${question}`;
}

function createScenarioOrder(scenario: { id: string; status: OrderStatus; deliveryStatus: string }): TakeoutOrder {
  const store = stores[0];
  const firstDish = dishes.find((dish) => dish.storeId === store.id) ?? dishes[0];

  return {
    id: scenario.id,
    storeId: store.id,
    storeName: store.name,
    items: [
      {
        dishId: firstDish.id,
        name: firstDish.name,
        quantity: 1,
        price: firstDish.price,
      },
    ],
    subtotal: firstDish.price,
    deliveryFee: store.deliveryFee,
    total: firstDish.price + store.deliveryFee,
    status: scenario.status,
    deliveryStatus: scenario.deliveryStatus,
    address: userAddress,
    createdAt: new Date().toLocaleString("zh-CN", { hour12: false }),
  };
}

function buildDebugReport({
  order,
  results,
  prompt,
  diagnostics,
}: {
  order: TakeoutOrder | null;
  results: RetrievalResult[];
  prompt: string;
  diagnostics: ChatResponse | null;
}) {
  return `# 外卖订单客服调试报告

## 订单
${order ? buildOrderContextMessage(order, "") : "-"}

## 检索证据
${results
  .map((item) => `- #${item.rank} ${item.intent ?? "-"} score=${item.score?.toFixed(4) ?? "-"}：${item.question}`)
  .join("\n") || "-"}

## Trace
\`\`\`json
${JSON.stringify(diagnostics?.full_trace ?? diagnostics?.trace ?? {}, null, 2)}
\`\`\`

## Session
\`\`\`json
${JSON.stringify(
  {
    user_id: diagnostics?.user_id,
    session_id: diagnostics?.session_id,
    order_id: diagnostics?.order_id,
    context_used: diagnostics?.context_used,
    memory_snapshot: diagnostics?.memory_snapshot,
    intent_analysis: diagnostics?.intent_analysis,
    safety_status: diagnostics?.safety_status,
    tool_results: diagnostics?.tool_results,
    evidence_citations: diagnostics?.evidence_citations,
  },
  null,
  2,
)}
\`\`\`

## Prompt
\`\`\`text
${prompt || "-"}
\`\`\`
`;
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

