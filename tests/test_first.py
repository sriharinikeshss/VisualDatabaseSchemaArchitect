from selenium import webdriver
from selenium.webdriver.common.by import By
import time

driver = webdriver.Chrome()

driver.get("https://www.selenium.dev/selenium/web/web-form.html")

print("Page title:", driver.title)

text_box = driver.find_element(By.NAME, "my-text")

text_box.send_keys("Users")

button = driver.find_element(By.CSS_SELECTOR, "button")

button.click()

time.sleep(2)

message = driver.find_element(By.ID, "message")

print("Result:", message.text)

assert message.text == "Received!"

driver.quit()