import streamlit as st
import google.generativeai as genai

# --- PAGE SETUP ---
st.set_page_config(page_title="MediSim ER", layout="wide")
st.title("🏥 MediSim: High-Stakes ER Simulator")

# --- SIDEBAR CONFIG ---
with st.sidebar:
    st.header("Simulation Settings")
    # Pull the key safely from Streamlit Secrets
    if "GOOGLE_API_KEY" in st.secrets:
        api_key = st.secrets["GOOGLE_API_KEY"]
        st.success("API Key Loaded from Secrets")
    else:
        api_key = st.text_input("Enter Gemini API Key", type="password")

    st.markdown("---")
    st.info("Use this arena to test the knowledge you synthesized on your Kindle Scribe.")

# --- AI LOGIC ---
if api_key:
    genai.configure(api_key=api_key)
    
    # System Instruction: This is the "Brain" of your simulator
    system_instruction = (
        "You are an ER simulation engine. Act as the nurse, patient, and consultants. "
        "The user is the lead physician. Provide real-time vitals and telemetry. "
        "Be realistic and demanding. If the user makes a mistake, show the consequences."
    )

    # Initialize the model with the system instruction correctly
    model = genai.GenerativeModel(
        model_name='gemini-1.5-pro',
        system_instruction=system_instruction
    )
    
    # Initialize chat history with correct roles ('user' and 'model')
    if "messages" not in st.session_state:
        st.session_state.messages = []

    # Display chat history
    for message in st.session_state.messages:
        with st.chat_message(message["role"]):
            st.markdown(message["content"])

    # User Input
    if prompt := st.chat_input("Enter clinical order (e.g., 'Check Vitals')"):
        # 1. Add user message to state
        st.session_state.messages.append({"role": "user", "content": prompt})
        with st.chat_message("user"):
            st.markdown(prompt)

        # 2. Convert state to Gemini-friendly format (roles must be 'user' and 'model')
        history = [
            {"role": m["role"], "parts": [m["content"]]} 
            for m in st.session_state.messages
        ]

        # 3. Generate Response
        try:
            response = model.generate_content(history)
            with st.chat_message("assistant"):
                st.markdown(response.text)
            # Add AI message to state as 'model'
            st.session_state.messages.append({"role": "model", "content": response.text})
        except Exception as e:
            st.error(f"The simulation crashed: {e}")
else:
    st.warning("Please ensure your GOOGLE_API_KEY is set in Advanced Settings > Secrets.")
