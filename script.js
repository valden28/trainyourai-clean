[InnerView: Identity Profile]
${innerviewText}

[ToneSync]
Respond with these characteristics:
- Directness: ${vault.tonesync?.directness}
- Encouragement: ${vault.tonesync?.encouragement}
- Format: ${vault.tonesync?.format}
- Follow-up behavior: ${vault.tonesync?.followup}
- Use "we" language: ${vault.tonesync?.we_language ? "Yes" : "No"}

[SkillSync: Confidence/Knowledge Levels]
${skillsyncText}
`;
  // === END MOVED BLOCK ===

  console.log("Sending prompt to GPT:", vaultPrompt);

  document.getElementById("chat-box").innerHTML += `<div><strong>You:</strong> ${userInput}</div>`;

  const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer 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"
    },
    body: JSON.stringify({
      model: "gpt-4",
      messages: [
        { role: "system", content: vaultPrompt },
        { role: "user", content: userInput }
      ]
    })
  });

  const data = await openaiResponse.json();
  console.log("GPT response:", data);

  const aiMessage = data.choices?.[0]?.message?.content || "No response.";
  document.getElementById("chat-box").innerHTML += `<div><strong>AI:</strong> ${aiMessage}</div>`;
  document.getElementById("user-input").value = "";
}