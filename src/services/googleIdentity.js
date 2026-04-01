export async function getGoogleProfile() {
  return new Promise((resolve) => {
    if (typeof chrome === "undefined" || !chrome.identity) {
      resolve(null)
      return
    }

    // Try to get profile info (works if synced)
    chrome.identity.getProfileUserInfo({ accountStatus: "ANY" }, (userInfo) => {
      const email = userInfo?.email || ""
      const displayName = email.split("@")[0] || "User"
      const firstLetter = displayName.charAt(0).toUpperCase()

      // Generate a consistent color based on email
      const colors = [
        "#4285f4",
        "#ea4335",
        "#fbbc05",
        "#34a853",
        "#673ab7",
        "#3f51b5",
        "#009688",
      ]
      let colorIndex = 0
      if (email) {
        for (let i = 0; i < email.length; i++) {
          colorIndex += email.charCodeAt(i)
        }
      }
      const avatarColor = colors[colorIndex % colors.length]

      if (chrome.runtime.lastError || !userInfo.id) {
        // Fallback to letter avatar if no photo ID is available
        resolve({
          id: null,
          email: email,
          displayName: displayName,
          firstLetter: firstLetter,
          avatarColor: avatarColor,
          photoUrl: null, // Signal to UI to use letter avatar
        })
      } else {
        resolve({
          id: userInfo.id,
          email: email,
          displayName: displayName,
          firstLetter: firstLetter,
          avatarColor: avatarColor,
          // High quality photo URL if ID is available
          photoUrl: `https://profiles.google.com/s2/photos/profile/${userInfo.id}?sz=128`,
        })
      }
    })
  })
}
