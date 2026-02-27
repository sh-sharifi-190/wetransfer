import { ActionIcon, Menu } from "@mantine/core";
import Link from "next/link";
import { TbLink } from "react-icons/tb";
import { FormattedMessage } from "react-intl";

const NavbarShareMneu = () => {
  return (
    <Menu position="bottom-start" withinPortal>
      <Menu.Target>
        <ActionIcon>
          <TbLink />
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Item component={Link} href="/account/shares" icon={<TbLink />}>
          <FormattedMessage id="navbar.links.shares" />
        </Menu.Item>
        {/* --- REMOVED REVERSE SHARES LINK --- */}
      </Menu.Dropdown>
    </Menu>
  );
};

export default NavbarShareMneu;