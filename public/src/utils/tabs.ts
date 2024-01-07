// deno-lint-ignore-file
export const initTabs = () => {
    const tabWrappers = Array.from(document.querySelectorAll('.tabs'));
    tabWrappers.forEach(wrapper => {
        let tabSet = '';
        if (!wrapper.getAttribute('data-tabset-name')) throw new Error('No tab set name provided');
        else tabSet = wrapper.getAttribute('data-tabset-name')!;

        let currentTab = 0;
        const tabs: HTMLButtonElement[] =
            Array.from(wrapper.querySelector(':scope>.tab-buttons')!.querySelectorAll('.tab-button'));
        const tabBodies: HTMLElement[] =
            Array.from(wrapper.querySelectorAll(':scope>.tab-content'));

        const prevBtn = wrapper.querySelector('.prev-tab-btn') as HTMLButtonElement;
        const nextBtn = wrapper.querySelector('.next-tab-btn') as HTMLButtonElement;

        if (prevBtn) {
            prevBtn.onclick = () => {
                if (tabs[currentTab - 1]) tabs[currentTab - 1].click();
            }
        }

        if (nextBtn) {
            nextBtn.onclick = () => {
                if (tabs[currentTab + 1]) tabs[currentTab + 1].click();
            }
        }

        tabs.forEach((tab, idx) => {
            tab.onclick = () => {
                currentTab = idx;
                tabs.forEach(t => t.classList.remove('selected'));
                tab.classList.add('selected');
                tabBodies.forEach(body => body.style.display = 'none');

                const name = tab.getAttribute('data-tabname');
                const content = document.querySelector(`.tab-content[data-tabname="${name}"]`) as HTMLElement;
                if (content) {
                    content.style.display = 'block';
                }

                window.dispatchEvent(new CustomEvent('tabchange', {
                    detail: { name, tabSet }
                }));
            }
        })

        tabs[0].click();
    })
}