import streamlit as st
import google.generativeai as genai

# --- 1. MEDICAL MONITOR STYLING (The "Vibe") ---
st.set_page_config(page_title="MediSim: Clinical AI", layout="wide")

# This CSS replicates the glowing green telemetry and dark monitor look
st.markdown("""
    <style>
    .main { background-color: #050505; color: #00FFCC; }
    .stApp { background-color: #050505; }
    [data-testid="stHeader"] { background: rgba(0,0,0,0); }
    
    /* Telemetry Bar Styling */
    .monitor-bar {
        background-color: #0a0a0a;
        border: 2px solid #1a1a1a;
        border-radius: 10px;
        padding: 20px;
        margin-bottom: 25px;
        font-family: 'Courier New', Courier, monospace;
        color: #00FF41;
        box-shadow: 0 0 15px rgba(0, 255, 65, 0.2);
    }
    .vital-label { font-size: 0.8rem; color: #666; }
    .vital-value { font-size: 2rem; font-weight: bold; }
    </style>
    """, unsafe_allow_html=True)

# --- 2. THE TELEMETRY MONITOR (Top Section) ---
# This mimics the top bar in your React screenshot
st.markdown(f"""
    <div class="monitor-bar">
        <div style="display: flex; justify-content: space-around; text-align: center;">
            <div><span class="vital-label">ECG/HR</span><br><span class="vital-value" style="color: #ff3333;">152</span> <small>BPM</small></div>
            <div><span class="vital-label">NIBP</span><br><span class="vital-value" style="color: #ffff00;">118/76</span> <small>MAP 90</small></div>
            <div><span class="vital-label">SPO2</span><br><span class="vital-value" style="color: #33ccff;">97</span> <small>%</small></div>
            <div><span class="vital-label">RESP</span><br><span class="vital-value" style="color: #ffffff;">18</span> <small>BRPM</small></div>
        </div>
        <div style="margin-top: 10px; border-top: 1px solid #333; padding-top: 10px; font-size: 0.8rem; color: #ff3333;">
            ⚠️ ALARMS: ACTIVE — ATRIAL FIBRILLATION
        </div>
    </div>
    """, unsafe_allow_html=True)

# --- 3. AI LOGIC & AUTH ---
if "GOOGLE_API_KEY" in st.secrets:
    genai.configure(api_key=st.secrets["GOOGLE_API_KEY"])
    
    system_instruction = (
        "You are an ER simulation engine. Act as the nurse, patient, and consultants. "
        "The user is the lead physician. Stay in character as a medical professional. "
        "The current telemetry is: HR 152 (AFib), BP 118/76, SpO2 97%. Respond as a high-pressure nurse."
    )
    
    model = genai.GenerativeModel(model_name='gemini-1.5-pro', system_instruction=system_instruction)

    if "messages" not in st.session_state:
        st.session_state.messages = []

    # Display chat
    for message in st.session_state.messages:
        with st.chat_message(message["role"]):
            st.markdown(message["content"])

    if prompt := st.chat_input("Enter clinical order (e.g., 'Check Vitals')"):
        st.session_state.messages.append({"role": "user", "content": prompt})
        with st.chat_message("user"):
            st.markdown(prompt)

        history = [{"role": m["role"], "parts": [m["content"]]} for m in st.session_state.messages]

        try:
            response = model.generate_content(history)
            with st.chat_message("assistant"):
                st.markdown(response.text)
            st.session_state.messages.append({"role": "model", "content": response.text})
        except Exception as e:
            st.error(f"System Offline: {e}")
