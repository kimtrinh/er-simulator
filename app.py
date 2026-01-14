import streamlit as st
import google.generativeai as genai

# --- PAGE SETUP ---
st.set_page_config(page_title="MediSim ER", layout="wide")
st.title("🏥 MediSim: High-Stakes ER Simulator")

# --- SIDEBAR CONFIG ---
with st.sidebar:
    st.header("Simulation Settings")
    api_key = st.text_input("Enter Gemini API Key", type="password")
    st.markdown("---")
    st.info("Use this arena to test the knowledge you synthesized on your Kindle Scribe.")

# --- AI LOGIC ---
if api_key:
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel('gemini-1.5-pro')
    
    # System Instruction to set the ER "Vibe"
    system_instruction = (
        "You are an ER simulation engine. Act as the nurse, patient, and consultants. "
        "The user is the lead physician. Provide real-time vitals and telemetry. "
        "Be realistic and demanding. If the user makes a mistake, show the consequences."
    )

    if "messages" not in st.session_state:
        st.session_state.messages = [{"role": "user", "content": system_instruction}]

    # Display chat history
    for message in st.session_state.messages[1:]:
        with st.chat_message(message["role"]):
            st.markdown(message["content"])

    # User Input
    if prompt := st.chat_input("Enter clinical order..."):
        st.session_state.messages.append({"role": "user", "content": prompt})
        with st.chat_message("user"):
            st.markdown(prompt)

        # Generate Response
        response = model.generate_content(str(st.session_state.messages))
        with st.chat_message("assistant"):
            st.markdown(response.text)
            st.session_state.messages.append({"role": "assistant", "content": response.text})
else:
    st.warning("Please enter your Gemini API Key in the sidebar to begin.")
